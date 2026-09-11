import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingNotification } from "@/lib/customerNotifications";
import { sendAdminPush, sendDriverPush } from "@/lib/pushServer";
import { currentDriverLeg, driverProgressFromHistory } from "@/lib/driverOps";
import { bookingLegOperationalWindow } from "@/lib/bookingOperationalWindow";
import { sendMattEmail } from "@/lib/email";
import { reviewRatingEmail } from "@/lib/reviewRatingEmail";
import { REVIEW_DELAY_MINUTES } from "@/lib/reviews";

function appBaseUrl() {
  return String(process.env.NEXT_PUBLIC_APP_URL || "https://panel.matt-transport.pl").replace(/\/$/, "");
}

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
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute") };
}

function localSerialMinutes(year: number, month: number, day: number, hour: number, minute: number) {
  return Math.floor(Date.UTC(year, month - 1, day, hour, minute) / 60000);
}

function minutesUntil(dateValue: unknown, timeValue: unknown) {
  const date = String(dateValue || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Number.POSITIVE_INFINITY;
  const now = warsawParts();
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = String(timeValue || "00:00").slice(0, 5).split(":").map(Number);
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

function routeText(booking: any, leg: "primary" | "return") {
  const address = booking.pickup_address || "adres klienta";
  const airport = booking.airport_label || "lotnisko";
  if (leg === "return") return `${airport} → ${address}`;
  if (booking.service_type === "from_airport") return `${airport} → ${address}`;
  return `${address} → ${airport}`;
}

async function candidateBookings(admin: any, from: string, to: string) {
  const [primary, returns] = await Promise.all([
    admin.from("bookings").select("*")
      .gte("travel_date", from).lte("travel_date", to)
      .in("status", ["confirmed", "assigned"])
      .is("company_id", null).limit(200),
    admin.from("bookings").select("*")
      .gte("return_date", from).lte("return_date", to)
      .eq("service_type", "roundtrip")
      .in("status", ["confirmed", "assigned"])
      .is("company_id", null).limit(200)
  ]);
  const map = new Map<string, any>();
  for (const row of [...(primary.data ?? []), ...(returns.data ?? [])]) map.set(row.id, row);
  return [...map.values()];
}

async function historyMap(admin: any, ids: string[]) {
  const map = new Map<string, any[]>();
  if (!ids.length) return map;
  const { data } = await admin.from("booking_history")
    .select("booking_id,event,created_at")
    .in("booking_id", ids)
    .order("created_at", { ascending: true });
  for (const row of data ?? []) {
    const list = map.get(row.booking_id) ?? [];
    list.push(row);
    map.set(row.booking_id, list);
  }
  return map;
}

async function sendReminderEmail(
  booking: any,
  leg: "primary" | "return",
  serviceDate: string,
  serviceTime: string
) {
  if (!booking.email) return false;
  const portal = `${appBaseUrl()}/rezerwacja/${booking.customer_access_token}`;
  const result = await sendMattEmail({
    to: booking.email,
    subject: `Przypomnienie o przejeździe – ${booking.booking_number}`,
    html: `<div style="font-family:Arial,sans-serif;background:#0b0e13;color:#fff;padding:28px"><div style="max-width:650px;margin:auto;background:#151923;border:1px solid #343b49;border-radius:16px;padding:28px"><h2 style="color:#f1d28b">MATT TRANSPORT</h2><h1>Przypomnienie o przejeździe</h1><p style="color:#aab1bc;line-height:1.7">Rezerwacja <strong>${booking.booking_number}</strong> · ${serviceDate} · ${shortTime(serviceTime)}</p><p style="color:#aab1bc;line-height:1.7">${routeText(booking, leg)}</p><p><a href="${portal}" style="display:inline-block;background:#d5ae5d;color:#111;padding:14px 20px;border-radius:11px;text-decoration:none;font-weight:800">OTWÓRZ REZERWACJĘ</a></p></div></div>`
  });
  return Boolean(result.sent);
}

async function runCustomerReminders(admin: any, from: string, to: string) {
  const bookings = await candidateBookings(admin, from, to);
  const history = await historyMap(admin, bookings.map((b: any) => b.id));
  const stats = { checked: 0, reminder24: 0, reminder120: 0, skipped: 0, errors: 0 };

  for (const booking of bookings) {
    stats.checked += 1;
    const events = history.get(booking.id) ?? [];
    const progress = driverProgressFromHistory(events);
    const leg = currentDriverLeg(booking, progress);
    const operational = bookingLegOperationalWindow(booking, leg);
    const serviceDate = String(leg === "return" ? booking.return_date : booking.travel_date || "").slice(0, 10);
    const serviceTime = shortTime(leg === "return" ? booking.return_time : booking.travel_time);
    const until = minutesUntil(serviceDate, serviceTime);

    try {
      if (until >= 1410 && until <= 1470) {
        const marker = `REMINDER_24H:${leg}:${operational.startDate}:${operational.startTime}`;
        if (!events.some((x: any) => String(x.event || "").includes(marker))) {
          const [emailSent, push] = await Promise.all([
            sendReminderEmail(booking, leg, serviceDate, serviceTime).catch(() => false),
            sendBookingNotification(admin, booking, {
              kind: "reminder_24h",
              leg,
              eventKey: `reminder24:${booking.id}:${leg}:${operational.startDate}:${operational.startTime}`,
              serviceDate,
              serviceTime
            }).catch(() => null)
          ]);
          if (emailSent || push?.sent) {
            await admin.from("booking_history").insert({
              booking_id: booking.id,
              event: `${marker} · e-mail=${emailSent ? "OK" : "—"} · push=${push?.sent ? "OK" : "—"}`,
              created_by: null
            });
            stats.reminder24 += 1;
          }
        }
      }

      if (until >= 90 && until <= 135) {
        const push = await sendBookingNotification(admin, booking, {
          kind: "reminder_120",
          leg,
          eventKey: `reminder120:${booking.id}:${leg}:${operational.startDate}:${operational.startTime}`,
          serviceDate,
          serviceTime
        });
        if (push.sent) stats.reminder120 += 1;
      }
    } catch (error) {
      stats.errors += 1;
      console.error("Operations+ customer reminder:", error);
    }
  }

  return stats;
}

async function runDriverReminder(admin: any, from: string, to: string) {
  const selection = "id,booking_number,customer_name,pickup_address,airport_label,service_type,travel_date,travel_time,return_date,return_time,status,driver_id,vehicle_id,return_driver_id,return_vehicle_id";
  const [primary, returns] = await Promise.all([
    admin.from("bookings").select(selection).gte("travel_date", from).lte("travel_date", to).in("status", ["confirmed", "assigned"]).not("driver_id", "is", null),
    admin.from("bookings").select(selection).gte("return_date", from).lte("return_date", to).eq("service_type", "roundtrip").in("status", ["confirmed", "assigned"]).not("return_driver_id", "is", null)
  ]);
  const map = new Map<string, any>();
  for (const row of [...(primary.data ?? []), ...(returns.data ?? [])]) map.set(row.id, row);
  const bookings = [...map.values()];
  const history = await historyMap(admin, bookings.map((b: any) => b.id));
  const stats = { checked: 0, sent: 0, skipped: 0, errors: 0 };

  for (const booking of bookings) {
    stats.checked += 1;
    const progress = driverProgressFromHistory(history.get(booking.id) ?? []);
    const leg = currentDriverLeg(booking, progress);
    const driverId = leg === "return" ? booking.return_driver_id : booking.driver_id;
    const vehicleId = leg === "return" ? booking.return_vehicle_id : booking.vehicle_id;
    if (!driverId || !vehicleId) { stats.skipped += 1; continue; }
    const operational = bookingLegOperationalWindow(booking, leg);
    const until = minutesUntil(operational.startDate, operational.startTime);
    if (until < 45 || until > 75) { stats.skipped += 1; continue; }
    try {
      const result = await sendDriverPush(admin, driverId, {
        title: "⏰ KURS ZA OK. 60 MIN",
        body: `Start ${operational.startTime} · ${booking.customer_name} · ${routeText(booking, leg)}`,
        url: `/kierowca?booking=${booking.id}`,
        tag: `driver-reminder-${booking.id}-${leg}`,
        bookingId: booking.id,
        eventKey: `driver-reminder60:${booking.id}:${leg}:${operational.startDate}:${operational.startTime}`
      });
      if (result.sent > 0) stats.sent += 1; else stats.skipped += 1;
    } catch (error) {
      stats.errors += 1;
      console.error("Operations+ driver reminder:", error);
    }
  }
  return stats;
}

async function runReviewRequests(admin: any) {
  const now = Date.now();
  const dueBefore = new Date(now - REVIEW_DELAY_MINUTES * 60_000).toISOString();
  const recentAfter = new Date(now - 30 * 24 * 60 * 60_000).toISOString();
  const { data: bookings } = await admin.from("bookings").select("*")
    .eq("status", "completed").is("company_id", null)
    .not("completed_at", "is", null).is("review_request_sent_at", null)
    .lte("completed_at", dueBefore).gte("completed_at", recentAfter)
    .order("completed_at", { ascending: true }).limit(100);
  const stats = { checked: 0, sent: 0, skipped: 0, errors: 0 };

  for (const booking of bookings ?? []) {
    stats.checked += 1;
    const sentAt = new Date().toISOString();
    const staleClaimBefore = new Date(Date.now() - 30 * 60_000).toISOString();
    if (booking.review_request_started_at && booking.review_request_started_at > staleClaimBefore) { stats.skipped += 1; continue; }

    let claim = admin.from("bookings").update({ review_request_started_at: sentAt }).eq("id", booking.id).is("review_request_sent_at", null);
    claim = booking.review_request_started_at ? claim.eq("review_request_started_at", booking.review_request_started_at) : claim.is("review_request_started_at", null);
    const { data: claimed } = await claim.select("id").maybeSingle();
    if (!claimed) { stats.skipped += 1; continue; }

    const ratingUrl = `${appBaseUrl()}/opinia/${booking.customer_access_token}`;
    let emailSent = false;
    let pushSent = false;
    try {
      if (booking.email) {
        const template = reviewRatingEmail(booking, ratingUrl);
        const result = await sendMattEmail({ to: booking.email, subject: template.subject, html: template.html });
        emailSent = Boolean(result.sent);
      }
      const push = await sendBookingNotification(admin, booking, {
        kind: "review_request",
        eventKey: `review-request:${booking.id}`,
        url: ratingUrl,
        title: "⭐ Oceń przejazd MATT TRANSPORT"
      });
      pushSent = Boolean(push.sent);

      if (!emailSent && !pushSent) {
        await admin.from("bookings").update({ review_request_started_at: null }).eq("id", booking.id).is("review_request_sent_at", null);
        stats.skipped += 1;
        continue;
      }

      const patch: any = { review_request_sent_at: sentAt, review_request_started_at: null };
      if (emailSent) patch.review_request_email_sent_at = sentAt;
      if (pushSent) patch.review_request_push_sent_at = sentAt;
      await admin.from("bookings").update(patch).eq("id", booking.id);
      await admin.from("booking_history").insert({ booking_id: booking.id, event: `Automatyczna prośba o ocenę 1–5: e-mail=${emailSent ? "OK" : "—"}, push=${pushSent ? "OK" : "—"}.` });
      stats.sent += 1;
    } catch (error) {
      stats.errors += 1;
      await admin.from("bookings").update({ review_request_started_at: null }).eq("id", booking.id).is("review_request_sent_at", null);
      console.error("Operations+ review request:", error);
    }
  }
  return stats;
}

async function runAdminPendingEscalations(admin: any) {
  const due = new Date(Date.now() - 20 * 60_000).toISOString();
  const recent = new Date(Date.now() - 48 * 60 * 60_000).toISOString();
  const { data: bookings } = await admin.from("bookings").select("id,booking_number,customer_name,travel_date,travel_time,created_at")
    .eq("status", "pending")
    .is("admin_pending_escalation_sent_at", null)
    .lte("created_at", due).gte("created_at", recent)
    .order("created_at", { ascending: true }).limit(50);
  const stats = { checked: 0, sent: 0, errors: 0 };

  for (const booking of bookings ?? []) {
    stats.checked += 1;
    let pushSent = false;
    let emailSent = false;
    try {
      const push = await sendAdminPush(admin, {
        title: "⚠ REZERWACJA NIEPOTWIERDZONA",
        body: `${booking.booking_number} · ${booking.customer_name} · ${booking.travel_date} ${shortTime(booking.travel_time)} · oczekuje ponad 20 min`,
        url: `/panel/rezerwacje/${booking.id}`,
        tag: `pending-${booking.id}`
      });
      pushSent = push.sent > 0;
      const adminUrl = `${appBaseUrl()}/panel/rezerwacje/${booking.id}`;
      const mail = await sendMattEmail({
        to: process.env.ADMIN_EMAIL || "kontakt@matt-transport.pl",
        subject: `⚠ Rezerwacja ${booking.booking_number} nadal niepotwierdzona`,
        html: `<div style="font-family:Arial;background:#0b0e13;color:#fff;padding:28px"><div style="max-width:650px;margin:auto;background:#151923;padding:28px;border-radius:16px"><h2 style="color:#f1d28b">MATT Booking PRO</h2><h1>Rezerwacja czeka ponad 20 minut</h1><p><strong>${booking.booking_number}</strong> · ${booking.customer_name}</p><p><a href="${adminUrl}" style="display:inline-block;background:#d5ae5d;color:#111;padding:14px 18px;border-radius:10px;text-decoration:none;font-weight:bold">OTWÓRZ REZERWACJĘ</a></p></div></div>`
      });
      emailSent = Boolean(mail.sent);
      if (pushSent || emailSent) {
        const at = new Date().toISOString();
        await admin.from("bookings").update({ admin_pending_escalation_sent_at: at }).eq("id", booking.id).is("admin_pending_escalation_sent_at", null);
        await admin.from("booking_history").insert({ booking_id: booking.id, event: `Eskalacja po 20 min bez potwierdzenia: push=${pushSent ? "OK" : "—"}, e-mail=${emailSent ? "OK" : "—"}.` });
        stats.sent += 1;
      }
    } catch (error) {
      stats.errors += 1;
      console.error("Operations+ pending escalation:", error);
    }
  }
  return stats;
}

export async function POST(req: NextRequest) {
  const expected = process.env.CUSTOMER_NOTIFICATIONS_CRON_SECRET;
  const received = req.headers.get("x-customer-notifications-secret");
  if (!expected) return NextResponse.json({ error: "Brak CUSTOMER_NOTIFICATIONS_CRON_SECRET." }, { status: 500 });
  if (!received || received !== expected) return NextResponse.json({ error: "Brak dostępu." }, { status: 401 });

  const admin = createAdminClient();
  const from = dateText(0);
  const to = dateText(1);
  const [customerReminders, driverReminder, reviewRequests, adminEscalations] = await Promise.all([
    runCustomerReminders(admin, from, to),
    runDriverReminder(admin, from, to),
    runReviewRequests(admin),
    runAdminPendingEscalations(admin)
  ]);

  return NextResponse.json({ ok: true, customer_reminders: customerReminders, driver_reminder_60: driverReminder, review_requests: reviewRequests, admin_pending_escalations: adminEscalations });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "MATT Operations+ v4.4.0.1",
    jobs: ["customer_reminder_24h", "customer_reminder_120", "driver_reminder_60", "post_trip_rating", "admin_pending_20m"],
    method: "POST"
  });
}
