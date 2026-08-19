import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingNotification } from "@/lib/customerNotifications";

function warsawParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value || 0);

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute")
  };
}

function localSerialMinutes(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
) {
  return Math.floor(
    Date.UTC(year, month - 1, day, hour, minute) / 60000
  );
}

function minutesUntilBooking(booking: any) {
  const now = warsawParts();
  const [year, month, day] = String(booking.travel_date)
    .split("-")
    .map(Number);
  const [hour, minute] = String(booking.travel_time || "00:00")
    .slice(0, 5)
    .split(":")
    .map(Number);

  return (
    localSerialMinutes(year, month, day, hour, minute) -
    localSerialMinutes(
      now.year,
      now.month,
      now.day,
      now.hour,
      now.minute
    )
  );
}

function dateText(offsetDays = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export async function POST(req: NextRequest) {
  const expected = process.env.CUSTOMER_NOTIFICATIONS_CRON_SECRET;
  const received = req.headers.get("x-customer-notifications-secret");

  if (!expected) {
    return NextResponse.json(
      { error: "Brak CUSTOMER_NOTIFICATIONS_CRON_SECRET." },
      { status: 500 }
    );
  }

  if (!received || received !== expected) {
    return NextResponse.json(
      { error: "Brak dostępu." },
      { status: 401 }
    );
  }

  const admin = createAdminClient();
  const from = dateText(0);
  const to = dateText(1);

  const { data: bookings } = await admin
    .from("bookings")
    .select("*")
    .gte("travel_date", from)
    .lte("travel_date", to)
    .in("status", ["confirmed", "assigned"])
    .in("customer_notification_channel", ["sms", "whatsapp"])
    .is("company_id", null)
    .order("travel_date")
    .order("travel_time")
    .limit(100);

  let checked = 0;
  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const booking of bookings ?? []) {
    checked += 1;
    const until = minutesUntilBooking(booking);

    // Cron działa co 15 min. Szerokie okno + dedupe w logu
    // gwarantuje pojedyncze przypomnienie około 2h przed kursem.
    if (until < 90 || until > 135) {
      skipped += 1;
      continue;
    }

    try {
      const result = await sendBookingNotification(admin, booking, {
        kind: "reminder_120",
        eventKey: `reminder120:${booking.id}:${booking.travel_date}:${String(booking.travel_time).slice(0,5)}`
      });

      if (result.sent) sent += 1;
      else skipped += 1;
    } catch (error) {
      errors += 1;
      console.error("Customer reminder:", error);
    }
  }

  return NextResponse.json({ ok: true, checked, sent, skipped, errors });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "MATT Customer Notifications",
    method: "POST"
  });
}
