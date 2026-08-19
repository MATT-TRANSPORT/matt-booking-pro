import { createHmac, timingSafeEqual } from "node:crypto";

export type CustomerNotificationKind =
  | "received"
  | "confirmed"
  | "assigned"
  | "reminder_120"
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
};

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://panel.matt-transport.pl"
  ).replace(/\/$/, "");
}

function twilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const messagingServiceSid =
    process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();

  if (!accountSid || !authToken || !messagingServiceSid) {
    return null;
  }

  return {
    accountSid,
    authToken,
    messagingServiceSid,
    whatsappContentSid:
      process.env.TWILIO_WHATSAPP_CONTENT_SID?.trim() || null
  };
}

export function customerMessagingConfigured() {
  const config = twilioConfig();
  return {
    sms: Boolean(config),
    whatsapp: Boolean(config?.whatsappContentSid),
    provider: "twilio"
  };
}

export function normalizePhone(value: unknown) {
  let phone = String(value ?? "").trim();
  if (!phone) return null;

  phone = phone.replace(/[\s().-]/g, "");

  if (phone.startsWith("00")) {
    phone = `+${phone.slice(2)}`;
  } else if (!phone.startsWith("+")) {
    const digits = phone.replace(/\D/g, "");
    phone = digits.length === 9 ? `+48${digits}` : `+${digits}`;
  }

  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    return null;
  }

  return phone;
}

function routeText(booking: any) {
  if (booking.service_type === "from_airport") {
    return `${booking.airport_label} → ${booking.pickup_address}`;
  }

  if (booking.service_type === "roundtrip") {
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

function messageFor(
  booking: any,
  options: NotifyOptions
) {
  const number = booking.booking_number;
  const date = booking.travel_date;
  const time = shortTime(booking.travel_time);
  const route = routeText(booking);
  const url = portalUrl(booking);
  const driver = options.driver || booking._driver;
  const vehicle = options.vehicle || booking._vehicle;
  const alert = options.alert;
  const flight = options.flight;

  let update = "";

  switch (options.kind) {
    case "received":
      update = `Przyjęliśmy rezerwację ${number} na ${date} o ${time}. Oczekuje na potwierdzenie MATT TRANSPORT.`;
      break;
    case "confirmed":
      update = `Rezerwacja ${number} została potwierdzona. ${date} o ${time}, ${route}.`;
      break;
    case "assigned":
      update = `Do rezerwacji ${number} przypisano kierowcę ${driver?.full_name || "MATT TRANSPORT"}${driver?.phone ? `, tel. ${driver.phone}` : ""}${vehicle ? `. Pojazd: ${vehicle.name}${vehicle.registration ? `, ${vehicle.registration}` : ""}` : ""}.`;
      break;
    case "reminder_120":
      update = `Przypomnienie: przejazd ${number} jest dzisiaj o ${time}. Trasa: ${route}.`;
      break;
    case "in_progress":
      update = `Kierowca ${driver?.full_name || "MATT TRANSPORT"} wyruszył na realizację rezerwacji ${number}${driver?.phone ? `. Kontakt: ${driver.phone}` : ""}.`;
      break;
    case "arrived":
      update = `Kierowca ${driver?.full_name || "MATT TRANSPORT"} jest już na miejscu odbioru dla rezerwacji ${number}${driver?.phone ? `. Kontakt: ${driver.phone}` : ""}.`;
      break;
    case "completed":
      update = `Rezerwacja ${number} została zakończona. Dziękujemy za podróż z MATT TRANSPORT.`;
      break;
    case "cancelled":
      update = `Rezerwacja ${number} została anulowana. W razie pytań zadzwoń: +48 691 242 691.`;
      break;
    case "flight_delay": {
      const delay = Number(
        alert?.payload?.delay ??
        flight?.arr_delayed ??
        flight?.dep_delayed ??
        0
      );
      update = `Monitorujemy lot ${flight?.flight_number || booking.flight_number || ""}. Aktualne opóźnienie: ${delay} min. Kierowca otrzymuje aktualizacje — nie musisz zmieniać rezerwacji ${number}.`;
      break;
    }
    case "flight_cancelled":
      update = `Lot ${flight?.flight_number || booking.flight_number || ""} powiązany z rezerwacją ${number} został oznaczony jako odwołany. MATT TRANSPORT skontaktuje się w sprawie dalszych ustaleń.`;
      break;
    case "flight_diverted":
      update = `Lot ${flight?.flight_number || booking.flight_number || ""} powiązany z rezerwacją ${number} został przekierowany. Monitorujemy sytuację i skontaktujemy się w razie potrzeby.`;
      break;
  }

  const smsBody = `MATT TRANSPORT: ${update} Szczegóły: ${url}`;

  return {
    update,
    smsBody,
    url,
    whatsappVariables: {
      "1": String(number || "—"),
      "2": update,
      "3": url
    }
  };
}

async function reserveLog(
  admin: any,
  booking: any,
  {
    eventKey,
    channel,
    toPhone,
    body,
    contentSid
  }: {
    eventKey: string;
    channel: "sms" | "whatsapp";
    toPhone: string;
    body: string;
    contentSid?: string | null;
  }
) {
  const { data, error } = await admin
    .from("customer_message_log")
    .insert({
      booking_id: booking.id,
      event_key: eventKey,
      channel,
      provider: "twilio",
      to_phone: toPhone,
      body,
      content_sid: contentSid || null,
      status: "preparing"
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

async function twilioPost(params: URLSearchParams) {
  const config = twilioConfig();
  if (!config) {
    throw new Error(
      "Brak konfiguracji Twilio: TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_MESSAGING_SERVICE_SID."
    );
  }

  const auth = Buffer.from(
    `${config.accountSid}:${config.authToken}`
  ).toString("base64");

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString(),
      cache: "no-store"
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error: any = new Error(
      data?.message || `Twilio HTTP ${response.status}`
    );
    error.code = data?.code;
    throw error;
  }

  return data;
}

function statusCallbackUrl() {
  return `${appBaseUrl()}/api/integrations/twilio/status`;
}

async function finalizeLog(
  admin: any,
  logId: string,
  result: any
) {
  await admin
    .from("customer_message_log")
    .update({
      provider_message_sid: result.sid || null,
      status: result.status || "queued",
      error_code: null,
      error_message: null,
      updated_at: new Date().toISOString()
    })
    .eq("id", logId);
}

async function failLog(
  admin: any,
  logId: string,
  error: any
) {
  await admin
    .from("customer_message_log")
    .update({
      status: "failed",
      error_code: error?.code ? String(error.code) : null,
      error_message:
        error instanceof Error ? error.message : String(error),
      updated_at: new Date().toISOString()
    })
    .eq("id", logId);
}

export async function sendSmsNotification(
  admin: any,
  booking: any,
  eventKey: string,
  body: string
) {
  const config = twilioConfig();
  if (!config) {
    return { sent: false, skipped: true, error: "Twilio nie jest skonfigurowane." };
  }

  const phone = normalizePhone(booking.phone);
  if (!phone) {
    return { sent: false, skipped: true, error: "Nieprawidłowy numer telefonu klienta." };
  }

  const reserved = await reserveLog(admin, booking, {
    eventKey,
    channel: "sms",
    toPhone: phone,
    body
  });

  if (reserved.duplicate) {
    return { sent: false, skipped: true, duplicate: true };
  }

  try {
    const params = new URLSearchParams({
      To: phone,
      MessagingServiceSid: config.messagingServiceSid,
      Body: body,
      StatusCallback: statusCallbackUrl()
    });

    const result = await twilioPost(params);
    await finalizeLog(admin, reserved.log.id, result);
    return { sent: true, channel: "sms", sid: result.sid };
  } catch (error: any) {
    await failLog(admin, reserved.log.id, error);
    return {
      sent: false,
      channel: "sms",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function sendWhatsAppNotification(
  admin: any,
  booking: any,
  eventKey: string,
  body: string,
  variables: Record<string, string>
) {
  const config = twilioConfig();
  if (!config?.whatsappContentSid) {
    return {
      sent: false,
      skipped: true,
      error: "Brak TWILIO_WHATSAPP_CONTENT_SID."
    };
  }

  const phone = normalizePhone(booking.phone);
  if (!phone) {
    return { sent: false, skipped: true, error: "Nieprawidłowy numer telefonu klienta." };
  }

  const reserved = await reserveLog(admin, booking, {
    eventKey,
    channel: "whatsapp",
    toPhone: phone,
    body,
    contentSid: config.whatsappContentSid
  });

  if (reserved.duplicate) {
    return { sent: false, skipped: true, duplicate: true };
  }

  try {
    const params = new URLSearchParams({
      To: `whatsapp:${phone}`,
      MessagingServiceSid: config.messagingServiceSid,
      ContentSid: config.whatsappContentSid,
      ContentVariables: JSON.stringify(variables),
      StatusCallback: statusCallbackUrl()
    });

    const result = await twilioPost(params);
    await finalizeLog(admin, reserved.log.id, result);
    return { sent: true, channel: "whatsapp", sid: result.sid };
  } catch (error: any) {
    await failLog(admin, reserved.log.id, error);
    return {
      sent: false,
      channel: "whatsapp",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function sendBookingNotification(
  admin: any,
  bookingInput: any,
  options: NotifyOptions
) {
  if (!bookingInput || bookingInput.company_id) {
    return { sent: false, skipped: true, reason: "b2b_or_missing" };
  }

  const channel = String(
    bookingInput.customer_notification_channel || "email"
  );

  if (!['sms', 'whatsapp'].includes(channel)) {
    return { sent: false, skipped: true, reason: "email_only" };
  }

  const booking = await enrichBooking(admin, bookingInput);
  const message = messageFor(booking, options);

  if (channel === "sms") {
    return sendSmsNotification(
      admin,
      booking,
      options.eventKey,
      message.smsBody
    );
  }

  const whatsapp = await sendWhatsAppNotification(
    admin,
    booking,
    options.eventKey,
    message.smsBody,
    message.whatsappVariables
  );

  if (whatsapp.sent || whatsapp.duplicate) {
    return whatsapp;
  }

  // WhatsApp niedostępny lub błąd synchroniczny -> SMS awaryjny.
  const sms = await sendSmsNotification(
    admin,
    booking,
    options.eventKey,
    message.smsBody
  );

  return {
    ...sms,
    fallback_from: "whatsapp",
    whatsapp_error: whatsapp.error || null
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

export function verifyTwilioFormSignature(
  url: string,
  params: Record<string, string>,
  signature: string | null
) {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token || !signature) return false;

  const data =
    url +
    Object.keys(params)
      .sort()
      .map((key) => `${key}${params[key]}`)
      .join("");

  const expected = createHmac("sha1", token)
    .update(data, "utf8")
    .digest("base64");

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);

  return a.length === b.length && timingSafeEqual(a, b);
}
