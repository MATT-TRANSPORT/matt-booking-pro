import { NextRequest, NextResponse } from "next/server";
import { apiAdmin } from "@/lib/apiAdmin";
import {
  sendBookingNotification,
  customerMessagingConfigured,
  type CustomerNotificationKind
} from "@/lib/customerNotifications";

export async function GET() {
  const session = await apiAdmin();
  if ("error" in session) {
    return NextResponse.json(
      { error: session.error },
      { status: session.status }
    );
  }

  return NextResponse.json(customerMessagingConfigured());
}

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
      { error: "Brak rezerwacji." },
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

  let kind: CustomerNotificationKind = "confirmed";

  if (body.kind) {
    kind = body.kind as CustomerNotificationKind;
  } else if (
    booking.status === "assigned" ||
    booking.driver_id
  ) {
    kind = "assigned";
  } else if (booking.status === "cancelled") {
    kind = "cancelled";
  }

  const result = await sendBookingNotification(
    session.admin,
    booking,
    {
      kind,
      eventKey: `manual:${kind}:${booking.id}:${Date.now()}`
    }
  );

  await session.admin.from("booking_history").insert({
    booking_id: booking.id,
    event: result.sent
      ? `Ręcznie wysłano powiadomienie klienta (${result.channel || "SMS/WhatsApp"})`
      : `Próba ręcznego powiadomienia klienta: ${result.error || result.reason || "pominięto"}`,
    created_by: session.user.id
  });

  return NextResponse.json(result, {
    status: result.sent || result.skipped ? 200 : 500
  });
}
