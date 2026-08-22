import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingNotification } from "@/lib/customerNotifications";
import { sendDriverPush } from "@/lib/pushServer";
import { currentDriverLeg, driverProgressFromHistory } from "@/lib/driverOps";
import { sendMattEmail } from "@/lib/email";
import { reviewRequestEmail } from "@/lib/emailTemplates";
import { googleReviewUrl, REVIEW_DELAY_MINUTES } from "@/lib/reviews";

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

function localSerialMinutes(year: number, month: number, day: number, hour: number, minute: number) {
  return Math.floor(Date.UTC(year, month - 1, day, hour, minute) / 60000);
}

function minutesUntil(dateValue: unknown, timeValue: unknown) {
  const date = String(dateValue || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Number.POSITIVE_INFINITY;

  const now = warsawParts();
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = String(timeValue || "00:00")
    .slice(0, 5)
    .split(":")
    .map(Number);

  return localSerialMinutes(year, month, day, hour || 0, minute || 0) -
    localSerialMinutes(now.year, now.month, now.day, now.hour, now.minute);
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

function shortTime(value: unknown) {
  return String(value || "").slice(0, 5);
}

function driverLegRoute(booking: any, leg: "primary" | "return") {
  const address = booking.pickup_address || "adres klienta";
  const airport = booking.airport_label || "lotnisko";
  if (leg === "return") return `${airport} → ${address}`;
  if (booking.service_type === "from_airport") return `${airport} → ${address}`;
  return `${address} → ${airport}`;
}

async function runCustomerReminder(admin: any, from: string, to: string) {
  const [primary, returns] = await Promise.all([
    admin.from("bookings").select("*")
      .gte("travel_date", from).lte("travel_date", to)
      .in("status", ["confirmed", "assigned"])
      .is("company_id", null)
      .limit(150),
    admin.from("bookings").select("*")
      .gte("return_date", from).lte("return_date", to)
      .eq("service_type", "roundtrip")
      .in("status", ["confirmed", "assigned"])
      .is("company_id", null)
      .limit(150)
  ]);

  const byId = new Map<string, any>();
  for (const row of [...(primary.data ?? []), ...(returns.data ?? [])]) byId.set(row.id, row);
  const bookings = [...byId.values()];
  const candidateIds = bookings.map((b: any) => b.id);
  let activeBookingIds = new Set<string>();
  const historyByBooking = new Map<string, any[]>();

  if (candidateIds.length) {
    const [{ data: activeSubs }, { data: history }] = await Promise.all([
      admin
        .from("customer_push_subscriptions")
        .select("booking_id")
        .in("booking_id", candidateIds)
        .eq("active", true),
      admin
        .from("booking_history")
        .select("booking_id,event,created_at")
        .in("booking_id", candidateIds)
        .order("created_at", { ascending: true })
    ]);

    activeBookingIds = new Set((activeSubs ?? []).map((row: any) => String(row.booking_id)));
    for (const row of history ?? []) {
      const list = historyByBooking.get(row.booking_id) ?? [];
      list.push(row);
      historyByBooking.set(row.booking_id, list);
    }
  }

  let checked = 0;
  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const booking of bookings) {
    if (!activeBookingIds.has(String(booking.id))) {
      skipped += 1;
      continue;
    }

    checked += 1;
    const progress = driverProgressFromHistory(historyByBooking.get(booking.id) ?? []);
    const leg = currentDriverLeg(booking, progress);
    const date = leg === "return" ? booking.return_date : booking.travel_date;
    const time = leg === "return" ? booking.return_time : booking.travel_time;
    const until = minutesUntil(date, time);

    // Cron co 15 min; deduplikacja w logu gwarantuje jedną wiadomość dla każdej nogi.
    if (until < 90 || until > 135) {
      skipped += 1;
      continue;
    }

    try {
      const result = await sendBookingNotification(admin, booking, {
        kind: "reminder_120",
        leg,
        eventKey: `reminder120:${booking.id}:${leg}:${date}:${shortTime(time)}`
      });
      if (result.sent) sent += 1;
      else skipped += 1;
    } catch (error) {
      errors += 1;
      console.error("Customer reminder:", error);
    }
  }

  return { checked, sent, skipped, errors };
}

async function runDriverReminder(admin: any, from: string, to: string) {
  const selection = "id,booking_number,customer_name,pickup_address,airport_label,service_type,travel_date,travel_time,return_date,return_time,status,driver_id,vehicle_id";

  const [primary, returns] = await Promise.all([
    admin.from("bookings").select(selection)
      .gte("travel_date", from).lte("travel_date", to)
      .in("status", ["confirmed", "assigned"]).not("driver_id", "is", null),
    admin.from("bookings").select(selection)
      .gte("return_date", from).lte("return_date", to)
      .eq("service_type", "roundtrip")
      .in("status", ["confirmed", "assigned"]).not("driver_id", "is", null)
  ]);

  const map = new Map<string, any>();
  for (const row of [...(primary.data ?? []), ...(returns.data ?? [])]) map.set(row.id, row);
  const bookings = [...map.values()];
  const ids = bookings.map((b: any) => b.id);

  const historyByBooking = new Map<string, any[]>();
  if (ids.length) {
    const { data: history } = await admin
      .from("booking_history")
      .select("booking_id,event,created_at")
      .in("booking_id", ids)
      .order("created_at", { ascending: true });
    for (const row of history ?? []) {
      const list = historyByBooking.get(row.booking_id) ?? [];
      list.push(row);
      historyByBooking.set(row.booking_id, list);
    }
  }

  let checked = 0;
  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const booking of bookings) {
    checked += 1;
    if (!booking.vehicle_id) {
      skipped += 1;
      continue;
    }

    const progress = driverProgressFromHistory(historyByBooking.get(booking.id) ?? []);
    const leg = currentDriverLeg(booking, progress);
    const date = leg === "return" ? booking.return_date : booking.travel_date;
    const time = leg === "return" ? booking.return_time : booking.travel_time;
    const until = minutesUntil(date, time);

    if (until < 45 || until > 75) {
      skipped += 1;
      continue;
    }

    try {
      const result = await sendDriverPush(admin, booking.driver_id, {
        title: "⏰ KURS ZA OK. 60 MIN",
        body: `${shortTime(time)} · ${booking.customer_name} · ${driverLegRoute(booking, leg)}`,
        url: `/kierowca?booking=${booking.id}`,
        tag: `driver-reminder-${booking.id}-${leg}`,
        bookingId: booking.id,
        eventKey: `driver-reminder60:${booking.id}:${leg}:${date}:${shortTime(time)}`
      });
      if (result.sent > 0) sent += 1;
      else skipped += 1;
    } catch (error) {
      errors += 1;
      console.error("Driver reminder:", error);
    }
  }

  return { checked, sent, skipped, errors };
}

async function runReviewRequests(admin: any) {
  const now = Date.now();
  const dueBefore = new Date(now - REVIEW_DELAY_MINUTES * 60_000).toISOString();
  const recentAfter = new Date(now - 30 * 24 * 60 * 60_000).toISOString();

  const { data: bookings } = await admin
    .from("bookings")
    .select("*")
    .eq("status", "completed")
    .is("company_id", null)
    .not("completed_at", "is", null)
    .is("review_request_sent_at", null)
    .lte("completed_at", dueBefore)
    .gte("completed_at", recentAfter)
    .order("completed_at", { ascending: true })
    .limit(100);

  let checked = 0;
  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const booking of bookings ?? []) {
    checked += 1;
    const sentAt = new Date().toISOString();
    const staleClaimBefore = new Date(Date.now() - 30 * 60_000).toISOString();

    if (booking.review_request_started_at && booking.review_request_started_at > staleClaimBefore) {
      skipped += 1;
      continue;
    }

    let claim = admin
      .from("bookings")
      .update({ review_request_started_at: sentAt })
      .eq("id", booking.id)
      .is("review_request_sent_at", null);

    claim = booking.review_request_started_at
      ? claim.eq("review_request_started_at", booking.review_request_started_at)
      : claim.is("review_request_started_at", null);

    const { data: claimed } = await claim.select("id").maybeSingle();
    if (!claimed) {
      skipped += 1;
      continue;
    }

    let emailSent = false;
    let pushSent = false;

    try {
      if (booking.email) {
        const template = reviewRequestEmail(booking, googleReviewUrl());
        const result = await sendMattEmail({
          to: booking.email,
          subject: template.subject,
          html: template.html
        });
        emailSent = result.sent;
      }

      const push = await sendBookingNotification(admin, booking, {
        kind: "review_request",
        eventKey: `review-request:${booking.id}`,
        url: googleReviewUrl(),
        title: "⭐ Oceń MATT TRANSPORT"
      });
      pushSent = Boolean(push.sent);

      if (!emailSent && !pushSent) {
        await admin
          .from("bookings")
          .update({ review_request_started_at: null })
          .eq("id", booking.id)
          .is("review_request_sent_at", null);
        skipped += 1;
        continue;
      }

      const patch: any = {
        review_request_sent_at: sentAt,
        review_request_started_at: null
      };
      if (emailSent) patch.review_request_email_sent_at = sentAt;
      if (pushSent) patch.review_request_push_sent_at = sentAt;

      await admin.from("bookings").update(patch).eq("id", booking.id);
      await admin.from("booking_history").insert({
        booking_id: booking.id,
        event: `Automatyczna prośba o opinię: e-mail=${emailSent ? "OK" : "—"}, push=${pushSent ? "OK" : "—"}.`
      });
      sent += 1;
    } catch (error) {
      errors += 1;
      await admin
        .from("bookings")
        .update({ review_request_started_at: null })
        .eq("id", booking.id)
        .is("review_request_sent_at", null);
      console.error("Review request:", error);
    }
  }

  return { checked, sent, skipped, errors };
}

export async function POST(req: NextRequest) {
  const expected = process.env.CUSTOMER_NOTIFICATIONS_CRON_SECRET;
  const received = req.headers.get("x-customer-notifications-secret");

  if (!expected) {
    return NextResponse.json({ error: "Brak CUSTOMER_NOTIFICATIONS_CRON_SECRET." }, { status: 500 });
  }
  if (!received || received !== expected) {
    return NextResponse.json({ error: "Brak dostępu." }, { status: 401 });
  }

  const admin = createAdminClient();
  const from = dateText(0);
  const to = dateText(1);

  const [customerReminder, driverReminder, reviewRequests] = await Promise.all([
    runCustomerReminder(admin, from, to),
    runDriverReminder(admin, from, to),
    runReviewRequests(admin)
  ]);

  return NextResponse.json({
    ok: true,
    customer_reminder_120: customerReminder,
    driver_reminder_60: driverReminder,
    review_requests: reviewRequests
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "MATT Production Notifications v4",
    jobs: ["customer_reminder_120", "driver_reminder_60", "post_trip_review"],
    method: "POST"
  });
}
