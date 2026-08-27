import { bookingLegOperationalWindow } from "@/lib/bookingOperationalWindow";
import {
  createPrivateKey,
  createSign
} from "node:crypto";

const GOOGLE_TOKEN_URL =
  "https://oauth2.googleapis.com/token";

const GOOGLE_CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.events";

const GOOGLE_CALENDAR_API =
  "https://www.googleapis.com/calendar/v3";

const WARSAW_TIME_ZONE =
  process.env.GOOGLE_CALENDAR_TIME_ZONE ||
  "Europe/Warsaw";

function paymentMethodLabel(booking: any) {
  if (booking.company_id) {
    return booking.payment_method === "employee_payment"
      ? "Płatność online firmy"
      : "Przelew firmowy";
  }

  if (
    booking.payment_method === "online" ||
    Boolean(booking.online_payment_requested)
  ) {
    return "Płatność online";
  }

  if (booking.payment_method === "bank_transfer") {
    return "Przelew tradycyjny";
  }

  return "Gotówka u kierowcy";
}

function paymentStatusCalendarLabel(booking: any) {
  const status = String(booking.payment_status || "pending").toLowerCase();

  if (status === "paid") return "✅ OPŁACONO";
  if (status === "refunded") return "↩ ZWROT";
  if (status === "review") return "⚠ DO WERYFIKACJI";
  if (status === "failed") return "❌ PŁATNOŚĆ NIEUDANA";

  if (booking.company_id) {
    return booking.payment_method === "employee_payment"
      ? "⏳ OCZEKUJE NA PŁATNOŚĆ ONLINE"
      : "🏢 ROZLICZENIE FIRMOWE";
  }

  if (
    booking.payment_method === "online" ||
    Boolean(booking.online_payment_requested)
  ) {
    return "⏳ OCZEKUJE NA PŁATNOŚĆ ONLINE";
  }

  if (booking.payment_method === "bank_transfer") {
    return "🏦 OCZEKUJE NA PRZELEW";
  }

  return "💵 PŁATNOŚĆ U KIEROWCY";
}

function paymentAmountLabel(booking: any) {
  const cents = Number(booking.payment_amount_cents);
  const amount =
    Number.isFinite(cents) && cents > 0
      ? cents / 100
      : Number(
          booking.company_id
            ? booking.price_gross ?? booking.total_price ?? 0
            : booking.total_price ?? 0
        );

  if (!Number.isFinite(amount) || amount <= 0) return null;

  return new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount) + " zł";
}

function paymentDateLabel(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: WARSAW_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

type CalendarResult = {
  configured: boolean;
  synced: boolean;
  deleted?: boolean;
  waitingForAssignment?: boolean;
  missingDriver?: boolean;
  missingVehicle?: boolean;
  error?: string | null;
  primaryEventId?: string | null;
  returnEventId?: string | null;
};

function base64url(value: string | Buffer) {
  const buffer =
    typeof value === "string"
      ? Buffer.from(value)
      : value;

  return buffer
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function normalizePrivateKey(
  value: string
) {
  let key = String(value || "").trim();

  // Częsty przypadek: do Vercel wklejono
  // wartość dokładnie z JSON-a razem z cudzysłowami.
  if (
    key.startsWith('"') &&
    key.endsWith('"')
  ) {
    try {
      key = JSON.parse(key);
    } catch {
      key = key.slice(1, -1);
    }
  } else if (
    key.startsWith("'") &&
    key.endsWith("'")
  ) {
    key = key.slice(1, -1);
  }

  // Obsługa zarówno prawdziwych nowych linii,
  // jak i znaków \n skopiowanych z JSON-a.
  key = key
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\r\n/g, "\n")
    .trim();

  if (
    !key.includes(
      "-----BEGIN PRIVATE KEY-----"
    ) ||
    !key.includes(
      "-----END PRIVATE KEY-----"
    )
  ) {
    throw new Error(
      "GOOGLE_CALENDAR_PRIVATE_KEY ma nieprawidłowy format. Wklej wartość pola private_key z pliku JSON, razem z BEGIN/END PRIVATE KEY."
    );
  }

  return key;
}

function calendarConfig() {
  const email =
    process.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL;

  const rawPrivateKey =
    process.env.GOOGLE_CALENDAR_PRIVATE_KEY;

  const calendarId =
    process.env.GOOGLE_CALENDAR_ID;

  if (
    !email ||
    !rawPrivateKey ||
    !calendarId
  ) {
    return null;
  }

  const privateKey =
    normalizePrivateKey(rawPrivateKey);

  return {
    email: email.trim(),
    privateKey,
    calendarId: calendarId.trim()
  };
}

async function getAccessToken() {
  const config = calendarConfig();

  if (!config) {
    throw new Error(
      "Brak konfiguracji Google Calendar."
    );
  }

  const now = Math.floor(Date.now() / 1000);

  const header = base64url(
    JSON.stringify({
      alg: "RS256",
      typ: "JWT"
    })
  );

  const payload = base64url(
    JSON.stringify({
      iss: config.email,
      scope: GOOGLE_CALENDAR_SCOPE,
      aud: GOOGLE_TOKEN_URL,
      iat: now,
      exp: now + 3600
    })
  );

  const signingInput =
    `${header}.${payload}`;

  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();

  let privateKeyObject;

  try {
    privateKeyObject =
      createPrivateKey({
        key: config.privateKey,
        format: "pem"
      });
  } catch {
    throw new Error(
      "Nie można odczytać GOOGLE_CALENDAR_PRIVATE_KEY. Sprawdź wartość private_key z pliku JSON w Vercel."
    );
  }

  const signature = base64url(
    signer.sign(privateKeyObject)
  );

  const assertion =
    `${signingInput}.${signature}`;

  const response = await fetch(
    GOOGLE_TOKEN_URL,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type:
          "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion
      }),
      cache: "no-store"
    }
  );

  const data =
    await response.json().catch(() => ({}));

  if (!response.ok || !data.access_token) {
    throw new Error(
      data?.error_description ||
        data?.error ||
        `Google OAuth HTTP ${response.status}`
    );
  }

  return String(data.access_token);
}

function eventId(
  bookingId: string,
  leg: "primary" | "return"
) {
  // Google event IDs accept base32hex:
  // lowercase a-v and digits 0-9.
  // UUID hex chars a-f are valid.
  const normalized =
    String(bookingId)
      .toLowerCase()
      .replace(/[^a-f0-9]/g, "");

  return `matt${normalized}${
    leg === "return" ? "r" : "p"
  }`;
}

function localDateTime(
  date: string,
  time: string
) {
  const hhmm =
    String(time || "00:00").slice(0, 5);

  return `${date}T${hhmm}:00`;
}

function assignmentForLeg(booking: any, leg: "primary" | "return") {
  if (leg === "return") {
    return {
      driverId: booking.return_driver_id || null,
      vehicleId: booking.return_vehicle_id || null,
      driverName: booking.return_driver_name || null,
      driverPhone: booking.return_driver_phone || null,
      vehicleName: booking.return_vehicle_name || null,
      vehicleRegistration: booking.return_vehicle_registration || null
    };
  }

  return {
    driverId: booking.driver_id || null,
    vehicleId: booking.vehicle_id || null,
    driverName: booking.driver_name || null,
    driverPhone: booking.driver_phone || null,
    vehicleName: booking.vehicle_name || null,
    vehicleRegistration: booking.vehicle_registration || null
  };
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "OCZEKUJE",
    confirmed: "POTWIERDZONA",
    assigned: "PRZYPISANA",
    in_progress: "W DRODZE",
    arrived: "NA MIEJSCU",
    picked_up: "PASAŻER ODEBRANY",
    completed: "ZAKOŃCZONA",
    cancelled: "ANULOWANA"
  };

  return labels[status] || status;
}

function routeFor(
  booking: any,
  leg: "primary" | "return"
) {
  if (
    booking.service_type === "roundtrip" &&
    leg === "return"
  ) {
    return (
      `${booking.airport_label} → ` +
      `${booking.pickup_address}`
    );
  }

  if (
    booking.service_type === "from_airport"
  ) {
    return (
      `${booking.airport_label} → ` +
      `${booking.pickup_address}`
    );
  }

  return (
    `${booking.pickup_address} → ` +
    `${booking.airport_label}`
  );
}

function locationFor(
  booking: any,
  leg: "primary" | "return"
) {
  if (
    booking.service_type === "from_airport" ||
    (
      booking.service_type === "roundtrip" &&
      leg === "return"
    )
  ) {
    return booking.airport_label || "";
  }

  return booking.pickup_address || "";
}

function bookingEventBody(
  booking: any,
  leg: "primary" | "return"
) {
  const isReturn =
    leg === "return";

  const date =
    isReturn
      ? booking.return_date
      : booking.travel_date;

  const time =
    isReturn
      ? booking.return_time
      : booking.travel_time;

  const flight =
    isReturn
      ? booking.return_flight_number
      : booking.flight_number;

  const route =
    routeFor(booking, leg);

  const assignment = assignmentForLeg(booking, leg);
  const operational = bookingLegOperationalWindow(booking, leg);
  const startDateTime = `${operational.startKey}:00`;
  const endDateTime = `${operational.endKey}:00`;

  const summary =
    `MATT · ${String(
      booking.booking_number || ""
    )} · ${route}`;

  const panelBase = (
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://panel.matt-transport.pl"
  ).replace(/\/$/, "");

  const description = [
    `STATUS: ${statusLabel(booking.status)}`,
    `Rezerwacja: ${booking.booking_number}`,
    `Klient: ${booking.customer_name || "—"}`,
    `Telefon: ${booking.phone || "—"}`,
    `Trasa: ${route}`,
    `Okno operacyjne: ${operational.startDate} ${operational.startTime} – ${operational.endDate} ${operational.endTime}`,
    `${leg === "return" || booking.service_type === "from_airport" ? "Przylot" : "Wylot"}: ${operational.scheduledDate} ${operational.scheduledTime}`,
    `Pasażerowie: ${booking.passengers || "—"}`,
    `Lot: ${flight || "—"}`,
    `Płatność: ${paymentMethodLabel(booking)}`,
    `Status płatności: ${paymentStatusCalendarLabel(booking)}`,
    paymentAmountLabel(booking)
      ? `Kwota: ${paymentAmountLabel(booking)}`
      : null,
    booking.payment_status === "paid" && paymentDateLabel(booking.payment_paid_at)
      ? `Opłacono: ${paymentDateLabel(booking.payment_paid_at)}`
      : null,
    booking.payment_status === "refunded" && paymentDateLabel(booking.payment_refunded_at)
      ? `Zwrot: ${paymentDateLabel(booking.payment_refunded_at)}`
      : null,
    `Kierowca: ${assignment.driverName || "—"}`,
    `Telefon kierowcy: ${assignment.driverPhone || "—"}`,
    `Pojazd: ${
      assignment.vehicleName
        ? `${assignment.vehicleName}${
            assignment.vehicleRegistration
              ? ` · ${assignment.vehicleRegistration}`
              : ""
          }`
        : "—"
    }`,
    booking.company_name
      ? `Firma: ${booking.company_name}`
      : null,
    booking.notes
      ? `Uwagi: ${booking.notes}`
      : null,
    "",
    `Panel MATT: ${panelBase}/panel/rezerwacje/${booking.id}`
  ]
    .filter(Boolean)
    .join("\n");

  return {
    summary,
    location: locationFor(
      booking,
      leg
    ),
    description,
    start: {
      dateTime: startDateTime,
      timeZone: WARSAW_TIME_ZONE
    },
    end: {
      dateTime: endDateTime,
      timeZone: WARSAW_TIME_ZONE
    },
    extendedProperties: {
      private: {
        matt_booking_id:
          String(booking.id),
        matt_booking_number:
          String(
            booking.booking_number || ""
          ),
        matt_leg: leg
      }
    },
    reminders: {
      useDefault: false,
      overrides: [
        {
          method: "popup",
          minutes: 60
        }
      ]
    }
  };
}

async function googleRequest(
  path: string,
  init: RequestInit
) {
  const token = await getAccessToken();

  const response = await fetch(
    `${GOOGLE_CALENDAR_API}${path}`,
    {
      ...init,
      headers: {
        Authorization:
          `Bearer ${token}`,
        "Content-Type":
          "application/json",
        ...(init.headers || {})
      },
      cache: "no-store"
    }
  );

  const text = await response.text();

  let data: any = {};

  try {
    data = text
      ? JSON.parse(text)
      : {};
  } catch {
    data = {
      raw: text
    };
  }

  return {
    response,
    data
  };
}

async function upsertEvent(
  calendarId: string,
  id: string,
  body: any
) {
  const encodedCalendar =
    encodeURIComponent(calendarId);

  const encodedEvent =
    encodeURIComponent(id);

  const patch = await googleRequest(
    `/calendars/${encodedCalendar}/events/${encodedEvent}`,
    {
      method: "PATCH",
      body: JSON.stringify(body)
    }
  );

  if (patch.response.ok) {
    return patch.data;
  }

  if (patch.response.status !== 404) {
    throw new Error(
      patch.data?.error?.message ||
        `Google Calendar PATCH HTTP ${patch.response.status}`
    );
  }

  const insert = await googleRequest(
    `/calendars/${encodedCalendar}/events`,
    {
      method: "POST",
      body: JSON.stringify({
        id,
        ...body
      })
    }
  );

  // 409 = event exists, e.g. prior insert succeeded
  // but our response was lost. Patch it once more.
  if (
    insert.response.status === 409
  ) {
    const retry =
      await googleRequest(
        `/calendars/${encodedCalendar}/events/${encodedEvent}`,
        {
          method: "PATCH",
          body: JSON.stringify(body)
        }
      );

    if (!retry.response.ok) {
      throw new Error(
        retry.data?.error?.message ||
          `Google Calendar retry HTTP ${retry.response.status}`
      );
    }

    return retry.data;
  }

  if (!insert.response.ok) {
    throw new Error(
      insert.data?.error?.message ||
        `Google Calendar INSERT HTTP ${insert.response.status}`
    );
  }

  return insert.data;
}

async function deleteEvent(
  calendarId: string,
  id: string
) {
  const result =
    await googleRequest(
      `/calendars/${encodeURIComponent(
        calendarId
      )}/events/${encodeURIComponent(id)}`,
      {
        method: "DELETE"
      }
    );

  if (
    result.response.ok ||
    result.response.status === 404 ||
    result.response.status === 410
  ) {
    return;
  }

  throw new Error(
    result.data?.error?.message ||
      `Google Calendar DELETE HTTP ${result.response.status}`
  );
}

async function enrichBooking(
  admin: any,
  booking: any
) {
  let driver = null;
  let vehicle = null;
  let returnDriver = null;
  let returnVehicle = null;
  let company = null;

  if (booking.driver_id) {
    const { data } = await admin.from("drivers").select("full_name,phone").eq("id", booking.driver_id).maybeSingle();
    driver = data;
  }
  if (booking.vehicle_id) {
    const { data } = await admin.from("vehicles").select("name,registration").eq("id", booking.vehicle_id).maybeSingle();
    vehicle = data;
  }
  if (booking.return_driver_id) {
    const { data } = await admin.from("drivers").select("full_name,phone").eq("id", booking.return_driver_id).maybeSingle();
    returnDriver = data;
  }
  if (booking.return_vehicle_id) {
    const { data } = await admin.from("vehicles").select("name,registration").eq("id", booking.return_vehicle_id).maybeSingle();
    returnVehicle = data;
  }
  if (booking.company_id) {
    const { data } = await admin.from("companies").select("name").eq("id", booking.company_id).maybeSingle();
    company = data;
  }

  return {
    ...booking,
    driver_name: driver?.full_name || null,
    driver_phone: driver?.phone || null,
    vehicle_name: vehicle?.name || null,
    vehicle_registration: vehicle?.registration || null,
    return_driver_name: returnDriver?.full_name || null,
    return_driver_phone: returnDriver?.phone || null,
    return_vehicle_name: returnVehicle?.name || null,
    return_vehicle_registration: returnVehicle?.registration || null,
    company_name: company?.name || null
  };
}

export function googleCalendarConfigured() {
  return Boolean(calendarConfig());
}

export async function syncBookingCalendar(
  admin: any,
  bookingOrId: any
): Promise<CalendarResult> {
  const config = calendarConfig();

  if (!config) {
    return {
      configured: false,
      synced: false,
      error:
        "Google Calendar nie jest jeszcze skonfigurowany."
    };
  }

  const booking =
    typeof bookingOrId === "string"
      ? (
          await admin
            .from("bookings")
            .select("*")
            .eq("id", bookingOrId)
            .single()
        ).data
      : bookingOrId;

  if (!booking) {
    return {
      configured: true,
      synced: false,
      error:
        "Nie znaleziono rezerwacji."
    };
  }

  const primaryId =
    eventId(
      booking.id,
      "primary"
    );

  const returnId =
    eventId(
      booking.id,
      "return"
    );

  try {
    // Anulowanie zawsze usuwa wydarzenia.
    if (booking.status === "cancelled") {
      await deleteEvent(
        config.calendarId,
        primaryId
      );

      await deleteEvent(
        config.calendarId,
        returnId
      );

      await admin
        .from("bookings")
        .update({
          google_calendar_event_id: null,
          google_calendar_return_event_id: null,
          google_calendar_synced_at:
            new Date().toISOString(),
          google_calendar_sync_error: null
        })
        .eq("id", booking.id);

      return {
        configured: true,
        synced: true,
        deleted: true,
        primaryEventId: null,
        returnEventId: null
      };
    }

    const enriched = await enrichBooking(admin, booking);
    const primaryAssigned = Boolean(booking.driver_id && booking.vehicle_id);
    const returnRequired = Boolean(booking.service_type === "roundtrip" && booking.return_date && booking.return_time);
    const returnAssigned = Boolean(booking.return_driver_id && booking.return_vehicle_id);

    let syncedPrimaryId: string | null = null;
    let syncedReturnId: string | null = null;

    if (primaryAssigned) {
      await upsertEvent(config.calendarId, primaryId, bookingEventBody(enriched, "primary"));
      syncedPrimaryId = primaryId;
    } else {
      await deleteEvent(config.calendarId, primaryId);
    }

    if (returnRequired && returnAssigned) {
      await upsertEvent(config.calendarId, returnId, bookingEventBody(enriched, "return"));
      syncedReturnId = returnId;
    } else {
      await deleteEvent(config.calendarId, returnId);
    }

    const syncedAt =
      new Date().toISOString();

    await admin
      .from("bookings")
      .update({
        google_calendar_event_id:
          syncedPrimaryId,
        google_calendar_return_event_id:
          syncedReturnId,
        google_calendar_synced_at:
          syncedAt,
        google_calendar_sync_error:
          null
      })
      .eq("id", booking.id);

    return {
      configured: true,
      synced: Boolean(syncedPrimaryId || syncedReturnId),
      waitingForAssignment: !primaryAssigned || (returnRequired && !returnAssigned),
      missingDriver: !booking.driver_id || (returnRequired && !booking.return_driver_id),
      missingVehicle: !booking.vehicle_id || (returnRequired && !booking.return_vehicle_id),
      primaryEventId: syncedPrimaryId,
      returnEventId: syncedReturnId
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nieznany błąd Google Calendar.";

    await admin
      .from("bookings")
      .update({
        google_calendar_sync_error:
          message
      })
      .eq("id", booking.id);

    return {
      configured: true,
      synced: false,
      error: message,
      primaryEventId:
        booking.google_calendar_event_id ||
        null,
      returnEventId:
        booking.google_calendar_return_event_id ||
        null
    };
  }
}
