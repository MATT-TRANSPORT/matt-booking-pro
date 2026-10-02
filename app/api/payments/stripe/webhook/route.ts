import {
  NextRequest,
  NextResponse
} from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMattEmail } from "@/lib/email";
import {
  paymentReceivedEmail,
  paymentRefundedEmail
} from "@/lib/emailTemplates";
import {
  getStripe,
  getStripeWebhookSecret
} from "@/lib/stripeServer";
import { syncBookingCalendar } from "@/lib/googleCalendar";
import { sendPaymentReceivedAdminPush } from "@/lib/adminNotifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function recipientForBooking(
  admin: any,
  booking: any
) {
  if (booking.company_id) {
    const { data: company } = await admin
      .from("companies")
      .select("email")
      .eq("id", booking.company_id)
      .single();

    return company?.email || null;
  }

  return booking.email || null;
}

async function bookingById(admin: any, id: string) {
  const { data } = await admin
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single();

  return data;
}

async function syncCalendarAfterPayment(admin: any, bookingId: string) {
  // Google Calendar jest warstwą operacyjną. Błąd synchronizacji
  // nigdy nie może cofnąć ani zablokować zaksięgowania Stripe.
  try {
    await syncBookingCalendar(admin, bookingId);
  } catch {
    // syncBookingCalendar zapisuje własny błąd w bookings, jeśli może.
  }
}

async function markPaid(
  admin: any,
  booking: any,
  session: Stripe.Checkout.Session
) {
  if (!booking) return;

  const paidAmount = Number(session.amount_total || 0);
  const expectedAmount = Math.round(
    Number(booking.company_id ? (booking.price_gross ?? booking.total_price ?? 0) : (booking.total_price ?? 0)) * 100
  );
  const status = String(booking.status || "");

  const mismatch =
    paidAmount !== expectedAmount ||
    !["confirmed", "assigned"].includes(status);

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id || null;

  if (mismatch) {
    const reason =
      paidAmount !== expectedAmount
        ? `Kwota Stripe ${paidAmount} gr nie zgadza się z aktualną kwotą rezerwacji ${expectedAmount} gr.`
        : `Rezerwacja ma status ${status} zamiast confirmed/assigned.`;

    await admin
      .from("bookings")
      .update({
        payment_provider: "stripe",
        payment_checkout_session_id: session.id,
        payment_intent_id: paymentIntentId,
        payment_amount_cents: paidAmount,
        payment_status: "review",
        payment_review_reason: reason,
        payment_last_error: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", booking.id);

    await admin.from("booking_history").insert({
      booking_id: booking.id,
      event:
        `⚠ Płatność Stripe wymaga weryfikacji: ${reason}`,
      created_by: null
    });

    await sendMattEmail({
      to:
        process.env.ADMIN_EMAIL ||
        "kontakt@matt-transport.pl",
      subject:
        `⚠ Płatność do weryfikacji – ${booking.booking_number}`,
      html: `
        <div style="font-family:Arial,sans-serif;background:#0b0e13;color:#fff;padding:28px">
          <div style="max-width:650px;margin:auto;background:#151923;border:1px solid #343b49;border-radius:16px;padding:28px">
            <h1>Płatność wymaga weryfikacji</h1>
            <p>Rezerwacja: <strong>${booking.booking_number}</strong></p>
            <p>${reason}</p>
          </div>
        </div>
      `
    }).catch(() => null);

    await syncCalendarAfterPayment(admin, booking.id);

    return;
  }

  const wasPaid = booking.payment_status === "paid";

  await admin
    .from("bookings")
    .update({
      payment_provider: "stripe",
      payment_checkout_session_id: session.id,
      payment_intent_id: paymentIntentId,
      payment_amount_cents: paidAmount,
      payment_currency:
        String(session.currency || "pln").toLowerCase(),
      payment_status: "paid",
      payment_paid_at:
        booking.payment_paid_at ||
        new Date().toISOString(),
      payment_refunded_at: null,
      payment_last_error: null,
      payment_review_reason: null,
      updated_at: new Date().toISOString()
    })
    .eq("id", booking.id);

  if (!wasPaid) {
    await admin.from("booking_history").insert({
      booking_id: booking.id,
      event:
        `✓ Płatność online Stripe zaksięgowana: ${(paidAmount / 100).toFixed(2)} zł`,
      created_by: null
    });

    const recipient =
      await recipientForBooking(admin, booking);

    if (recipient) {
      const template = paymentReceivedEmail({
        ...booking,
        payment_status: "paid"
      });

      await sendMattEmail({
        to: recipient,
        subject: template.subject,
        html: template.html
      }).catch(() => null);
    }

    await sendPaymentReceivedAdminPush(admin, booking, paidAmount);
  }

  await syncCalendarAfterPayment(admin, booking.id);
}

async function markTerminalPaymentSucceeded(
  admin: any,
  intent: Stripe.PaymentIntent
) {
  const paymentId = intent.metadata?.driver_card_payment_id || null;
  if (!paymentId) return null;

  const { data: payment } = await admin
    .from("driver_card_payments")
    .select("*")
    .eq("id", paymentId)
    .single();

  if (!payment) return null;

  const amountMatches = Number(intent.amount) === Number(payment.total_amount_cents);
  const currencyMatches = String(intent.currency || "").toLowerCase() === "pln";

  if (!amountMatches || !currencyMatches) {
    const reason =
      !amountMatches
        ? `Kwota PaymentIntent ${intent.amount} gr nie zgadza się z płatnością kierowcy ${payment.total_amount_cents} gr.`
        : `Waluta PaymentIntent ${intent.currency} jest nieprawidłowa.`;

    await admin
      .from("driver_card_payments")
      .update({
        status: "failed",
        failure_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq("id", payment.id);

    await admin.from("booking_history").insert({
      booking_id: payment.booking_id,
      event: `⚠ Płatność kierowcy wymaga weryfikacji: ${reason}`,
      created_by: null
    });

    return payment.booking_id;
  }

  const chargeId =
    typeof intent.latest_charge === "string"
      ? intent.latest_charge
      : intent.latest_charge?.id || null;

  await admin
    .from("driver_card_payments")
    .update({
      status: "succeeded",
      stripe_charge_id: chargeId,
      failure_reason: null,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", payment.id);

  const { data: booking } = await admin
    .from("bookings")
    .select("*")
    .eq("id", payment.booking_id)
    .single();

  if (booking) {
    const wasAlreadyPaid = booking.payment_status === "paid";

    const bookingUpdate: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (!wasAlreadyPaid) {
      bookingUpdate.payment_status = "paid";
      bookingUpdate.payment_provider = "stripe_terminal";
      bookingUpdate.payment_intent_id = intent.id;
      bookingUpdate.payment_amount_cents = payment.total_amount_cents;
      bookingUpdate.payment_currency = "pln";
      bookingUpdate.payment_paid_at = booking.payment_paid_at || new Date().toISOString();
      bookingUpdate.payment_last_error = null;
      bookingUpdate.payment_review_reason = null;
    }

    await admin
      .from("bookings")
      .update(bookingUpdate)
      .eq("id", booking.id);

    const description = payment.surcharge_amount_cents > 0
      ? `✓ Płatność kartą kierowcy: ${(payment.total_amount_cents / 100).toFixed(2)} zł (dopłata ${(payment.surcharge_amount_cents / 100).toFixed(2)} zł — ${payment.surcharge_reason || "bez podanego powodu"})`
      : `✓ Płatność kartą kierowcy: ${(payment.total_amount_cents / 100).toFixed(2)} zł`;

    await admin.from("booking_history").insert({
      booking_id: booking.id,
      event: description,
      created_by: null
    });

    await sendPaymentReceivedAdminPush(admin, booking, payment.total_amount_cents, payment.surcharge_amount_cents, payment.surcharge_reason);

    await syncCalendarAfterPayment(admin, booking.id);
  }

  return payment.booking_id;
}

async function markTerminalPaymentFailed(
  admin: any,
  intent: Stripe.PaymentIntent,
  status: "failed" | "canceled" = "failed"
) {
  const paymentId = intent.metadata?.driver_card_payment_id || null;
  if (!paymentId) return null;

  const reason =
    intent.last_payment_error?.message ||
    (status === "canceled" ? "Płatność anulowana." : "Płatność została odrzucona.");

  const { data: payment } = await admin
    .from("driver_card_payments")
    .select("id,booking_id")
    .eq("id", paymentId)
    .single();

  if (!payment) return null;

  await admin
    .from("driver_card_payments")
    .update({
      status,
      failure_reason: reason,
      updated_at: new Date().toISOString()
    })
    .eq("id", payment.id);

  return payment.booking_id;
}

async function markFailed(
  admin: any,
  booking: any,
  reason: string
) {
  if (!booking || booking.payment_status === "paid") {
    return;
  }

  await admin
    .from("bookings")
    .update({
      payment_status: "failed",
      payment_last_error: reason,
      updated_at: new Date().toISOString()
    })
    .eq("id", booking.id);

  await admin.from("booking_history").insert({
    booking_id: booking.id,
    event: `Płatność online nieudana: ${reason}`,
    created_by: null
  });

  await syncCalendarAfterPayment(admin, booking.id);
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature =
    req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Brak Stripe-Signature." },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      getStripeWebhookSecret()
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nieprawidłowy webhook Stripe."
      },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: previousEvent } = await admin
    .from("payment_webhook_events")
    .select("provider_event_id,processed_at")
    .eq("provider_event_id", event.id)
    .maybeSingle();

  if (previousEvent?.processed_at) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  if (!previousEvent) {
    await admin.from("payment_webhook_events").insert({
      provider_event_id: event.id,
      provider: "stripe",
      event_type: event.type,
      processing_status: "processing"
    });
  }

  let bookingId: string | null = null;

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session =
        event.data.object as Stripe.Checkout.Session;

      bookingId =
        session.metadata?.booking_id ||
        session.client_reference_id ||
        null;

      const booking = bookingId
        ? await bookingById(admin, bookingId)
        : null;

      if (booking) {
        if (
          event.type === "checkout.session.async_payment_succeeded" ||
          session.payment_status === "paid"
        ) {
          await markPaid(admin, booking, session);
        }
      }
    }

    if (
      event.type === "checkout.session.async_payment_failed"
    ) {
      const session =
        event.data.object as Stripe.Checkout.Session;

      bookingId =
        session.metadata?.booking_id ||
        session.client_reference_id ||
        null;

      const booking = bookingId
        ? await bookingById(admin, bookingId)
        : null;

      await markFailed(
        admin,
        booking,
        "Operator płatności zgłosił nieudaną płatność."
      );
    }

    if (event.type === "payment_intent.succeeded") {
      const intent =
        event.data.object as Stripe.PaymentIntent;

      if (intent.metadata?.source === "matt_driver_terminal") {
        bookingId = await markTerminalPaymentSucceeded(admin, intent);
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const intent =
        event.data.object as Stripe.PaymentIntent;

      if (intent.metadata?.source === "matt_driver_terminal") {
        bookingId = await markTerminalPaymentFailed(admin, intent, "failed");
      } else {
        bookingId = intent.metadata?.booking_id || null;

        const booking = bookingId
          ? await bookingById(admin, bookingId)
          : null;

        await markFailed(
          admin,
          booking,
          intent.last_payment_error?.message ||
            "Płatność została odrzucona."
        );
      }
    }

    if (event.type === "payment_intent.canceled") {
      const intent =
        event.data.object as Stripe.PaymentIntent;

      if (intent.metadata?.source === "matt_driver_terminal") {
        bookingId = await markTerminalPaymentFailed(admin, intent, "canceled");
      }
    }

    if (event.type === "charge.refunded") {
      const charge =
        event.data.object as Stripe.Charge;

      const paymentIntentId =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id || null;

      if (paymentIntentId) {
        const { data: terminalPayment } = await admin
          .from("driver_card_payments")
          .select("*")
          .eq("payment_intent_id", paymentIntentId)
          .maybeSingle();

        if (terminalPayment) {
          await admin
            .from("driver_card_payments")
            .update({
              status: "refunded",
              updated_at: new Date().toISOString()
            })
            .eq("id", terminalPayment.id);

          bookingId = terminalPayment.booking_id;

          await admin.from("booking_history").insert({
            booking_id: terminalPayment.booking_id,
            event: `↩ Zwrot płatności kartą kierowcy: ${(terminalPayment.total_amount_cents / 100).toFixed(2)} zł`,
            created_by: null
          });

          await syncCalendarAfterPayment(admin, terminalPayment.booking_id);
        } else {
          const { data: booking } = await admin
            .from("bookings")
            .select("*")
            .eq("payment_intent_id", paymentIntentId)
            .single();

          if (booking) {
          bookingId = booking.id;

          await admin
            .from("bookings")
            .update({
              payment_status: "refunded",
              payment_refunded_at:
                new Date().toISOString(),
              payment_last_error: null,
              updated_at: new Date().toISOString()
            })
            .eq("id", booking.id);

          await admin.from("booking_history").insert({
            booking_id: booking.id,
            event: "↩ Stripe: zarejestrowano zwrot płatności",
            created_by: null
          });

          const recipient =
            await recipientForBooking(admin, booking);

          if (recipient) {
            const template =
              paymentRefundedEmail(booking);

            await sendMattEmail({
              to: recipient,
              subject: template.subject,
              html: template.html
            }).catch(() => null);
          }

          await syncCalendarAfterPayment(admin, booking.id);
          }
        }
      }
    }

    await admin
      .from("payment_webhook_events")
      .update({
        booking_id: bookingId,
        processing_status: "processed",
        processed_at: new Date().toISOString(),
        error: null
      })
      .eq("provider_event_id", event.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Błąd przetwarzania webhooka.";

    await admin
      .from("payment_webhook_events")
      .update({
        booking_id: bookingId,
        processing_status: "error",
        error: message
      })
      .eq("provider_event_id", event.id);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
