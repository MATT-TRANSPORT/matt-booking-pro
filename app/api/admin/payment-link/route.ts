import {
  NextRequest,
  NextResponse
} from "next/server";
import { apiAdmin } from "@/lib/apiAdmin";
import { sendMattEmail } from "@/lib/email";
import { onlinePaymentEligible } from "@/lib/payment";
import { expireCheckoutSession } from "@/lib/stripeServer";

export async function POST(req: NextRequest) {
  const session = await apiAdmin();

  if ("error" in session) {
    return NextResponse.json(
      { error: session.error },
      { status: session.status }
    );
  }

  const body = await req.json();
  const bookingId = String(body.bookingId || "");

  if (!bookingId) {
    return NextResponse.json(
      { error: "Brak identyfikatora rezerwacji." },
      { status: 400 }
    );
  }

  const { data: booking } = await session.admin
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (!booking) {
    return NextResponse.json(
      { error: "Nie znaleziono rezerwacji." },
      { status: 404 }
    );
  }

  if (body.action === "mark_paid") {
    if (!onlinePaymentEligible(booking)) {
      return NextResponse.json(
        {
          error:
            "Ta rezerwacja jest rozliczana przelewem firmowym."
        },
        { status: 400 }
      );
    }

    await expireCheckoutSession(
      booking.payment_checkout_session_id
    );

    const { error } = await session.admin
      .from("bookings")
      .update({
        payment_status: "paid",
        payment_provider: "manual",
        payment_paid_at: new Date().toISOString(),
        payment_last_error: null,
        payment_review_reason: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", bookingId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    await session.admin.from("booking_history").insert({
      booking_id: bookingId,
      event:
        "Płatność oznaczona ręcznie jako OPŁACONA",
      created_by: session.user.id
    });

    return NextResponse.json({
      ok: true,
      payment_status: "paid"
    });
  }

  if (body.action === "mark_pending") {
    if (
      booking.payment_status === "paid" &&
      booking.payment_provider === "stripe"
    ) {
      return NextResponse.json(
        {
          error:
            "Płatność została zaksięgowana przez Stripe. Nie cofaj jej ręcznie — wykonaj zwrot u operatora płatności."
        },
        { status: 409 }
      );
    }

    const { error } = await session.admin
      .from("bookings")
      .update({
        payment_status: "pending",
        payment_provider: null,
        payment_paid_at: null,
        payment_last_error: null,
        payment_review_reason: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", bookingId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    await session.admin.from("booking_history").insert({
      booking_id: bookingId,
      event: "Cofnięto ręczne oznaczenie płatności",
      created_by: session.user.id
    });

    return NextResponse.json({
      ok: true,
      payment_status: "pending"
    });
  }

  if (booking.payment_method !== "employee_payment") {
    return NextResponse.json(
      {
        error:
          "Własny link płatności jest dostępny tylko dla płatności indywidualnej pracownika."
      },
      { status: 400 }
    );
  }

  const link = String(body.link || "").trim();

  const { error } = await session.admin
    .from("bookings")
    .update({
      payment_link: link || null,
      updated_at: new Date().toISOString()
    })
    .eq("id", bookingId);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  await session.admin.from("booking_history").insert({
    booking_id: bookingId,
    event: link
      ? "Zapisano / zaktualizowano własny link płatności pracownika"
      : "Usunięto własny link płatności pracownika",
    created_by: session.user.id
  });

  if (booking.email && link) {
    await sendMattEmail({
      to: booking.email,
      subject: `Link do płatności – ${booking.booking_number}`,
      html: `
        <div style="margin:0;background:#0b0e13;color:#fff;font-family:Arial,sans-serif;padding:28px">
          <div style="max-width:650px;margin:auto;background:#151923;border:1px solid #343b49;border-radius:16px;padding:28px">
            <h1>Link do płatności</h1>
            <p>Rezerwacja: <strong>${booking.booking_number}</strong></p>
            <p style="margin-top:22px">
              <a href="${link}" style="display:inline-block;background:#d5ae5d;color:#111;padding:14px 18px;border-radius:10px;text-decoration:none;font-weight:bold">
                PRZEJDŹ DO PŁATNOŚCI
              </a>
            </p>
          </div>
        </div>
      `
    }).catch(() => null);
  }

  return NextResponse.json({
    ok: true,
    payment_status:
      booking.payment_status || "pending"
  });
}
