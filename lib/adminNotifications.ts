import { sendAdminPush } from "@/lib/pushServer";

function compact(value: unknown, max = 54) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "—";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function money(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "";
  return ` · ${amount.toFixed(2).replace(".", ",")} zł`;
}

function bookingRoute(booking: any) {
  const address = compact(booking?.pickup_address, 42);
  const airport = compact(booking?.airport_label || booking?.airport_key, 36);
  const serviceType = String(booking?.service_type || "");

  if (serviceType === "from_airport") {
    return `${airport} → ${address}`;
  }

  if (serviceType === "roundtrip") {
    return `${address} ↔ ${airport}`;
  }

  return `${address} → ${airport}`;
}

export async function sendNewBookingAdminPush(
  admin: any,
  booking: any,
  source: "B2C" | "B2B"
) {
  if (!booking?.id) return null;

  const number = compact(booking.booking_number || booking.id, 24);
  const customer = compact(booking.customer_name, 36);
  const date = compact(booking.travel_date, 12);
  const time = compact(String(booking.travel_time || "").slice(0, 5), 5);

  return sendAdminPush(admin, {
    title: source === "B2B" ? "🏢 NOWA REZERWACJA B2B" : "🔔 NOWA REZERWACJA",
    body: `${number} · ${customer} · ${date} ${time} · ${bookingRoute(booking)}${money(booking.total_price)}`,
    url: `/panel/rezerwacje/${booking.id}`,
    tag: `admin-new-booking-${booking.id}`
  });
}

export async function sendNewWeddingAdminPush(admin: any, booking: any) {
  if (!booking?.id) return null;

  const number = compact(booking.booking_number || booking.id, 24);
  const customer = compact(booking.customer_name, 36);
  const date = compact(booking.start_date, 12);
  const time = compact(String(booking.start_time || "").slice(0, 5), 5);
  const restaurant = compact(booking.restaurant_name, 48);

  return sendAdminPush(admin, {
    title: "💍 NOWE WESELE",
    body: `${number} · ${customer} · ${date} ${time} · ${restaurant}`,
    url: `/panel/wesela/${booking.id}`,
    tag: `admin-new-wedding-${booking.id}`
  });
}
