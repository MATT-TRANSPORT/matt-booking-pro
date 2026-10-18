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
import { paymentBookingStatusAllowed } from "@/lib/payment";
import { assertStripeEventMode, claimStripeEvent } from "@/lib/stripeWebhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function recipientForBooking(
  admin: any,
  booking: any
) {
  if (booking.company_id) {
    const { data: company } = await admin
      .from("companies")
      .select("email")
      .eq("id", booking.company_id)
      .single().throwOnError();

    return company?.email || null;
  }

  return booking.email || null;
}

async function bookingById(admin: any, id: string) {
  const { data } = await admin
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single().throwOnError();

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

async function markAdminCheckoutSucceeded(
  admin: any,
  session: Stripe.Checkout.Session
) {
  const paymentId = session.metadata?.admin_stripe_payment_id || null;
  if (!paymentId) return null;

  const { data: payment } = await admin
    .from("admin_stripe_payments")
    .select("*")
    .eq("id", paymentId)
    .single().throwOnError();

  if (!payment) return null;

  if (payment.status === "refunded") return payment.booking_id || null;
  const paidAmount = Number(session.amount_total ?? -1);
  if (String(session.currency || "").toLowerCase() !== "pln" ||
      paidAmount !== Number(payment.amount_cents)) {
    throw new Error("Kwota lub waluta płatności administracyjnej jest nieprawidłowa.");
  }
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id || null;

  await admin
    .from("admin_stripe_payments")
    .update({
      status: "succeeded",
      checkout_session_id: session.id,
      payment_intent_id: paymentIntentId,
      failure_reason: null,
      paid_at: payment.paid_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", payment.id).throwOnError();

  const bookingId = payment.booking_id || null;

  if (bookingId) {
    const booking = await bookingById(admin, bookingId);

    if (booking) {
      if (payment.status !== "succeeded") await admin.from("booking_history").insert({
        booking_id: booking.id,
        event:
          `✓ Płatność Stripe z Panelu: ${(paidAmount / 100).toFixed(2)} zł · metoda ${payment.payment_method || "auto"}`,
        created_by: payment.created_by || null
      }).throwOnError();

      const expectedAmount = Math.round(
        Number(
          booking.company_id
            ? (booking.price_gross ?? booking.total_price ?? 0)
            : (booking.total_price ?? 0)
        ) * 100
      );

      const canSetPaid =
        paidAmount === expectedAmount &&
        String(booking.status || "") !== "cancelled" &&
        !["paid", "refunded"].includes(String(booking.payment_status || ""));

      if (canSetPaid) {
        await admin
          .from("bookings")
          .update({
            payment_status: "paid",
            payment_provider: "stripe_admin",
            payment_checkout_session_id: session.id,
            payment_intent_id: paymentIntentId,
            payment_amount_cents: paidAmount,
            payment_currency: String(session.currency || "pln").toLowerCase(),
            payment_paid_at: booking.payment_paid_at || new Date().toISOString(),
            payment_last_error: null,
            payment_review_reason: null,
            updated_at: new Date().toISOString()
          })
          .eq("id", booking.id).throwOnError();

        const recipient = await recipientForBooking(admin, booking);

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
  }

  return bookingId;
}

async function markAdminCheckoutFailed(
  admin: any,
  paymentId: string | null,
  reason: string
) {
  if (!paymentId) return null;

  const { data: payment } = await admin
    .from("admin_stripe_payments")
    .select("id,booking_id,status")
    .eq("id", paymentId)
    .single().throwOnError();

  if (!payment) return null;
  if (["succeeded", "refunded"].includes(payment.status)) return payment.booking_id || null;

  await admin
    .from("admin_stripe_payments")
    .update({
      status: "failed",
      failure_reason: reason,
      updated_at: new Date().toISOString()
    })
    .eq("id", payment.id).throwOnError();

  return payment.booking_id || null;
}

async function markAdminRefunded(
  admin: any,
  paymentIntentId: string
) {
  const { data: payment } = await admin
    .from("admin_stripe_payments")
    .select("*")
    .eq("payment_intent_id", paymentIntentId)
    .maybeSingle().throwOnError();

  if (!payment) return { handled: false, bookingId: null };

  await admin
    .from("admin_stripe_payments")
    .update({
      status: "refunded",
      refunded_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", payment.id).throwOnError();

  const bookingId = payment.booking_id || null;

  if (bookingId) {
    const booking = await bookingById(admin, bookingId);

    await admin.from("booking_history").insert({
      booking_id: bookingId,
      event:
        `↩ Zwrot płatności Stripe z Panelu: ${(Number(payment.amount_cents || 0) / 100).toFixed(2)} zł`,
      created_by: null
    }).throwOnError();

    if (
      booking &&
      booking.payment_provider === "stripe_admin" &&
      booking.payment_intent_id === paymentIntentId
    ) {
      await admin
        .from("bookings")
        .update({
          payment_status: "refunded",
          payment_refunded_at: new Date().toISOString(),
          payment_last_error: null,
          updated_at: new Date().toISOString()
        })
        .eq("id", booking.id).throwOnError();

      await syncCalendarAfterPayment(admin, booking.id);
    }
  }

  return { handled: true, bookingId };
}

async function markPaid(
  admin: any,
  booking: any,
  session: Stripe.Checkout.Session
) {
  if (!booking || booking.payment_status === "refunded") return;

  const paidAmount = Number(session.amount_total || 0);
  const expectedAmount = Math.round(
    Number(booking.company_id ? (booking.price_gross ?? booking.total_price ?? 0) : (booking.total_price ?? 0)) * 100
  );
  const status = String(booking.status || "");

  const mismatch =
    String(session.currency || "").toLowerCase() !== "pln" ||
    paidAmount !== expectedAmount ||
    !paymentBookingStatusAllowed(status);

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id || null;

  if (booking.payment_status === "paid" &&
      (booking.payment_checkout_session_id === session.id ||
       (paymentIntentId && booking.payment_intent_id === paymentIntentId))) {
    return;
  }

  if (mismatch) {
    const reason =
      String(session.currency || "").toLowerCase() !== "pln"
        ? "Waluta płatności Stripe jest nieprawidłowa."
        : paidAmount !== expectedAmount
        ? `Kwota Stripe ${paidAmount} gr nie zgadza się z aktualną kwotą rezerwacji ${expectedAmount} gr.`
        : `Rezerwacja ma status ${status}, który nie pozwala na zaksięgowanie płatności online.`;

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
      .eq("id", booking.id).throwOnError();

    await admin.from("booking_history").insert({
      booking_id: booking.id,
      event:
        `⚠ Płatność Stripe wymaga weryfikacji: ${reason}`,
      created_by: null
    }).throwOnError();

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

  // State and audit must commit together. A failed history insert rolls back
  // payment status, so Stripe can safely retry instead of losing the receipt.
  const { data: updatedBooking } = await admin.rpc("settle_customer_stripe_payment", {
    p_booking_id: booking.id,
    p_checkout_session_id: session.id,
    p_payment_intent_id: paymentIntentId,
    p_amount_cents: paidAmount,
    p_currency: String(session.currency || "").toLowerCase(),
    p_expected_status: booking.payment_status
  }).throwOnError();

  if (!updatedBooking) throw new Error("Stan płatności zmienił się podczas przetwarzania. Ponów zdarzenie.");

  if (!wasPaid) {
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
    .single().throwOnError();

  if (!payment) return null;

  if (payment.status === "refunded") return payment.booking_id;
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
      .eq("id", payment.id).throwOnError();

    await admin.from("booking_history").insert({
      booking_id: payment.booking_id,
      event: `⚠ Płatność kierowcy wymaga weryfikacji: ${reason}`,
      created_by: null
    }).throwOnError();

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
    .eq("id", payment.id).throwOnError();

  const { data: booking } = await admin
    .from("bookings")
    .select("*")
    .eq("id", payment.booking_id)
    .single().throwOnError();

  if (booking) {
    const wasAlreadyPaid = ["paid", "refunded"].includes(booking.payment_status);

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
      .eq("id", booking.id).throwOnError();

    const description = payment.surcharge_amount_cents > 0
      ? `✓ Płatność kartą kierowcy: ${(payment.total_amount_cents / 100).toFixed(2)} zł (dopłata ${(payment.surcharge_amount_cents / 100).toFixed(2)} zł — ${payment.surcharge_reason || "bez podanego powodu"})`
      : `✓ Płatność kartą kierowcy: ${(payment.total_amount_cents / 100).toFixed(2)} zł`;

    if (payment.status !== "succeeded") await admin.from("booking_history").insert({
      booking_id: booking.id,
      event: description,
      created_by: null
    }).throwOnError();

    if (payment.status !== "succeeded") await sendPaymentReceivedAdminPush(admin, booking, payment.total_amount_cents, payment.surcharge_amount_cents, payment.surcharge_reason);

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
    .select("id,booking_id,status")
    .eq("id", paymentId)
    .single().throwOnError();

  if (!payment) return null;
  if (["succeeded", "refunded"].includes(payment.status)) return payment.booking_id;

  await admin
    .from("driver_card_payments")
    .update({
      status,
      failure_reason: reason,
      updated_at: new Date().toISOString()
    })
    .eq("id", payment.id).throwOnError();

  return payment.booking_id;
}

async function markFailed(
  admin: any,
  booking: any,
  reason: string
) {
  if (!booking || ["paid", "refunded"].includes(booking.payment_status)) {
    return;
  }

  const { data: updatedBooking } = await admin
    .from("bookings")
    .update({
      payment_status: "failed",
      payment_last_error: reason,
      updated_at: new Date().toISOString()
    })
    .eq("id", booking.id)
    .eq("payment_status", booking.payment_status)
    .select("id").maybeSingle().throwOnError();
  if (!updatedBooking) return;

  await admin.from("booking_history").insert({
    booking_id: booking.id,
    event: `Płatność online nieudana: ${reason}`,
    created_by: null
  }).throwOnError();

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
    assertStripeEventMode(event.livemode);
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

  let admin: ReturnType<typeof createAdminClient>;
  let bookingId: string | null = null;
  let claimed = false;

  try {
    admin = createAdminClient();
    const claim = await claimStripeEvent(admin, event);
    if (claim === "processed") return NextResponse.json({ ok: true, duplicate: true });
    if (claim === "busy") return NextResponse.json({ error: "Zdarzenie jest przetwarzane." }, { status: 503 });
    claimed = true;
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session =
        event.data.object as Stripe.Checkout.Session;

      if (session.metadata?.source === "matt_admin_payment") {
        if (
          event.type === "checkout.session.async_payment_succeeded" ||
          session.payment_status === "paid"
        ) {
          bookingId = await markAdminCheckoutSucceeded(admin, session);
        }
      } else {
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
    }

    if (
      event.type === "checkout.session.async_payment_failed"
    ) {
      const session =
        event.data.object as Stripe.Checkout.Session;

      if (session.metadata?.source === "matt_admin_payment") {
        bookingId = await markAdminCheckoutFailed(
          admin,
          session.metadata?.admin_stripe_payment_id || null,
          "Operator płatności zgłosił nieudaną płatność."
        );
      } else {
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
      } else if (intent.metadata?.source === "matt_admin_payment") {
        bookingId = await markAdminCheckoutFailed(
          admin,
          intent.metadata?.admin_stripe_payment_id || null,
          intent.last_payment_error?.message || "Płatność została odrzucona."
        );
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
      } else if (intent.metadata?.source === "matt_admin_payment") {
        bookingId = await markAdminCheckoutFailed(
          admin,
          intent.metadata?.admin_stripe_payment_id || null,
          "Płatność została anulowana."
        );
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
        const adminRefund = await markAdminRefunded(admin, paymentIntentId);

        if (adminRefund.handled) {
          bookingId = adminRefund.bookingId;
        } else {
        const { data: terminalPayment } = await admin
          .from("driver_card_payments")
          .select("*")
          .eq("payment_intent_id", paymentIntentId)
          .maybeSingle().throwOnError();

        if (terminalPayment) {
          await admin
            .from("driver_card_payments")
            .update({
              status: "refunded",
              updated_at: new Date().toISOString()
            })
            .eq("id", terminalPayment.id).throwOnError();

          bookingId = terminalPayment.booking_id;

          await admin.from("booking_history").insert({
            booking_id: terminalPayment.booking_id,
            event: `↩ Zwrot płatności kartą kierowcy: ${(terminalPayment.total_amount_cents / 100).toFixed(2)} zł`,
            created_by: null
          }).throwOnError();

          await syncCalendarAfterPayment(admin, terminalPayment.booking_id);
        } else {
          const { data: booking } = await admin
            .from("bookings")
            .select("*")
            .eq("payment_intent_id", paymentIntentId)
            .single().throwOnError();

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
            .eq("id", booking.id).throwOnError();

          await admin.from("booking_history").insert({
            booking_id: booking.id,
            event: "↩ Stripe: zarejestrowano zwrot płatności",
            created_by: null
          }).throwOnError();

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
    }

    await admin
      .from("payment_webhook_events")
      .update({
        booking_id: bookingId,
        processing_status: "processed",
        processed_at: new Date().toISOString(),
        error: null
      })
      .eq("provider_event_id", event.id).throwOnError();

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Błąd przetwarzania webhooka.";

    if (claimed) {
      try {
        await admin!
          .from("payment_webhook_events")
          .update({
            booking_id: bookingId,
            processing_status: "error",
            error: message
          })
          .eq("provider_event_id", event.id).throwOnError();
      } catch {
        // Keep the non-2xx response even if recording the failure also fails.
        console.error("Stripe webhook: nie można zapisać błędu przetwarzania.");
      }
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
