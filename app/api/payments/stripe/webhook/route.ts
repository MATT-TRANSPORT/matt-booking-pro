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
  }
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

    if (event.type === "payment_intent.payment_failed") {
      const intent =
        event.data.object as Stripe.PaymentIntent;

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

    if (event.type === "charge.refunded") {
      const charge =
        event.data.object as Stripe.Charge;

      const paymentIntentId =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id || null;

      if (paymentIntentId) {
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
