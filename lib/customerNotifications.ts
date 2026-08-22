import webpush from "web-push";

export type CustomerNotificationKind =
  | "received"
  | "confirmed"
  | "assigned"
  | "reminder_120"
  | "review_request"
  | "in_progress"
  | "arrived"
  | "completed"
  | "cancelled"
  | "flight_delay"
  | "flight_cancelled"
  | "flight_diverted";

type NotifyOptions = {
  kind: CustomerNotificationKind;
  eventKey: string;
  driver?: any;
  vehicle?: any;
  alert?: any;
  flight?: any;
  leg?: "primary" | "return";
  force?: boolean;
  url?: string;
  title?: string;
};

export type CustomerNotificationResult = {
  sent: boolean;
  skipped: boolean;
  reason?: string;
  error?: string;
  duplicate?: boolean;
  channel?: "push";
  sent_count?: number;
  failed_count?: number;
};

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://panel.matt-transport.pl"
  ).replace(/\/$/, "");
}

function configureWebPush() {
  const subject =
    process.env.VAPID_SUBJECT ||
    "mailto:kontakt@matt-transport.pl";
  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey =
    process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    throw new Error("Brak kluczy VAPID w Vercel.");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export function customerMessagingConfigured() {
  return {
    push: Boolean(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY
    ),
    quick_whatsapp: true,
    provider: "web-push"
  };
}

function routeText(booking: any, leg?: "primary" | "return") {
  if (booking.service_type === "from_airport") {
    return `${booking.airport_label} → ${booking.pickup_address}`;
  }
  if (booking.service_type === "roundtrip") {
    if (leg === "return") return `${booking.airport_label} → ${booking.pickup_address}`;
    if (leg === "primary") return `${booking.pickup_address} → ${booking.airport_label}`;
    return `${booking.pickup_address} ↔ ${booking.airport_label}`;
  }
  return `${booking.pickup_address} → ${booking.airport_label}`;
}

function portalUrl(booking: any) {
  if (!booking.customer_access_token) return appBaseUrl();
  return `${appBaseUrl()}/rezerwacja/${booking.customer_access_token}`;
}

function shortTime(value: unknown) {
  return String(value || "").slice(0, 5);
}

async function enrichBooking(admin: any, booking: any) {
  let driver = null;
  let vehicle = null;

  if (booking.driver_id) {
    const { data } = await admin
      .from("drivers")
      .select("full_name,phone")
      .eq("id", booking.driver_id)
      .maybeSingle();
    driver = data;
  }

  if (booking.vehicle_id) {
    const { data } = await admin
      .from("vehicles")
      .select("name,registration")
      .eq("id", booking.vehicle_id)
      .maybeSingle();
    vehicle = data;
  }

  return { ...booking, _driver: driver, _vehicle: vehicle };
}

export function customerUpdateText(
  booking: any,
  options: Pick<NotifyOptions, "kind" | "driver" | "vehicle" | "alert" | "flight" | "leg">
) {
  const number = booking.booking_number;
  const returnLeg = options.leg === "return" && booking.service_type === "roundtrip";
  const date = returnLeg ? booking.return_date : booking.travel_date;
  const time = shortTime(returnLeg ? booking.return_time : booking.travel_time);
  const route = routeText(booking, options.leg);
  const driver = options.driver || booking._driver;
  const vehicle = options.vehicle || booking._vehicle;
  const alert = options.alert;
  const flight = options.flight;

  switch (options.kind) {
    case "received":
      return `Przyjęliśmy rezerwację ${number} na ${date} o ${time}. Oczekuje na potwierdzenie MATT TRANSPORT.`;
    case "confirmed":
      return `Rezerwacja ${number} została potwierdzona. ${date} o ${time}, ${route}.`;
    case "assigned":
      return `Do rezerwacji ${number} przypisano kierowcę ${driver?.full_name || "MATT TRANSPORT"}${driver?.phone ? `, tel. ${driver.phone}` : ""}${vehicle ? `. Pojazd: ${vehicle.name}${vehicle.registration ? `, ${vehicle.registration}` : ""}` : ""}.`;
    case "reminder_120":
      return `Przypomnienie: przejazd ${number} jest dzisiaj o ${time}. Trasa: ${route}.`;
    case "review_request":
      return `Dziękujemy za podróż z MATT TRANSPORT. Jeśli masz chwilę, oceń naszą obsługę w Google — Twoja opinia bardzo nam pomaga.`;
    case "in_progress":
      return `Kierowca ${driver?.full_name || "MATT TRANSPORT"} wyruszył na realizację rezerwacji ${number}${driver?.phone ? `. Kontakt: ${driver.phone}` : ""}.`;
    case "arrived":
      return `Kierowca ${driver?.full_name || "MATT TRANSPORT"} jest już na miejscu odbioru dla rezerwacji ${number}${driver?.phone ? `. Kontakt: ${driver.phone}` : ""}.`;
    case "completed":
      return `Rezerwacja ${number} została zakończona. Dziękujemy za podróż z MATT TRANSPORT.`;
    case "cancelled":
      return `Rezerwacja ${number} została anulowana. W razie pytań zadzwoń: +48 691 242 691.`;
    case "flight_delay": {
      const delay = Number(
        alert?.payload?.delay ??
        flight?.arr_delayed ??
        flight?.dep_delayed ??
        0
      );
      return `Monitorujemy lot ${flight?.flight_number || booking.flight_number || ""}. Aktualne opóźnienie: ${delay} min. Kierowca otrzymuje aktualizacje — nie musisz zmieniać rezerwacji ${number}.`;
    }
    case "flight_cancelled":
      return `Lot ${flight?.flight_number || booking.flight_number || ""} powiązany z rezerwacją ${number} został oznaczony jako odwołany. MATT TRANSPORT skontaktuje się w sprawie dalszych ustaleń.`;
    case "flight_diverted":
      return `Lot ${flight?.flight_number || booking.flight_number || ""} powiązany z rezerwacją ${number} został przekierowany. Monitorujemy sytuację i skontaktujemy się w razie potrzeby.`;
  }
}

export function quickWhatsAppText(booking: any) {
  const kind: CustomerNotificationKind =
    booking.status === "cancelled"
      ? "cancelled"
      : booking.status === "completed"
      ? "completed"
      : booking.status === "arrived"
      ? "arrived"
      : booking.status === "in_progress"
      ? "in_progress"
      : booking.driver_id && booking.vehicle_id
      ? "assigned"
      : "confirmed";

  return `Dzień dobry! ${customerUpdateText(booking, { kind })} Szczegóły: ${portalUrl(booking)}`;
}

export function quickWhatsAppUrl(booking: any) {
  const digits = String(booking.phone || "").replace(/\D/g, "");
  if (!digits) return null;
  const phone = digits.length === 9 ? `48${digits}` : digits;
  return `https://wa.me/${phone}?text=${encodeURIComponent(quickWhatsAppText(booking))}`;
}

async function reservePushLog(
  admin: any,
  booking: any,
  options: NotifyOptions,
  title: string,
  body: string,
  url: string
) {
  if (options.force) return { duplicate: false, log: null };

  const { data, error } = await admin
    .from("customer_push_notification_log")
    .insert({
      booking_id: booking.id,
      event_key: options.eventKey,
      title,
      body,
      url,
      sent_count: 0,
      failed_count: 0
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { duplicate: true, log: null };
    }
    throw new Error(error.message);
  }

  return { duplicate: false, log: data };
}

export async function sendBookingNotification(
  admin: any,
  bookingInput: any,
  options: NotifyOptions
): Promise<CustomerNotificationResult> {
  if (!bookingInput || bookingInput.company_id) {
    return { sent: false, skipped: true, reason: "b2b_or_missing" };
  }

  const { data: subscriptions } = await admin
    .from("customer_push_subscriptions")
    .select("*")
    .eq("booking_id", bookingInput.id)
    .eq("active", true);

  if (!subscriptions?.length) {
    return { sent: false, skipped: true, reason: "no_push_subscription" };
  }

  configureWebPush();
  const booking = await enrichBooking(admin, bookingInput);
  const body = customerUpdateText(booking, options);
  const url = options.url || portalUrl(booking);
  const title = options.title || (options.kind === "review_request" ? "⭐ Jak minęła podróż?" : "MATT TRANSPORT");

  const reserved = await reservePushLog(
    admin,
    booking,
    options,
    title,
    body,
    url
  );

  if (reserved.duplicate) {
    return { sent: false, skipped: true, duplicate: true, channel: "push" };
  }

  let sent = 0;
  let failed = 0;
  const payload = JSON.stringify({
    title,
    body,
    url,
    tag: `matt-customer-${booking.id}`,
    renotify: true
  });

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth }
        },
        payload,
        { TTL: 60 * 60 }
      );
      sent += 1;
    } catch (error: any) {
      failed += 1;
      const statusCode = Number(error?.statusCode || 0);
      if (statusCode === 404 || statusCode === 410) {
        await admin
          .from("customer_push_subscriptions")
          .update({
            active: false,
            updated_at: new Date().toISOString()
          })
          .eq("id", sub.id);
      }
    }
  }

  if (reserved.log) {
    await admin
      .from("customer_push_notification_log")
      .update({ sent_count: sent, failed_count: failed })
      .eq("id", reserved.log.id);
  }

  return {
    sent: sent > 0,
    sent_count: sent,
    failed_count: failed,
    skipped: false,
    channel: "push"
  };
}

export function shouldCustomerReceiveFlightAlert(
  booking: any,
  leg: "primary" | "return"
) {
  if (booking.company_id) return false;
  if (leg === "primary") {
    return booking.service_type === "from_airport";
  }
  return booking.service_type === "roundtrip";
}

// Legacy exports keep old, already-deployed v3.0 routes build-safe.
// Twilio is deliberately disabled in v3.0.1 COMMUNICATIONS LITE.
export async function sendSmsNotification() {
  return {
    sent: false,
    skipped: true,
    error: "Twilio wyłączone — używany jest Web Push."
  };
}

export function verifyTwilioFormSignature() {
  return false;
}
