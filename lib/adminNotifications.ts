import { sendAdminPush } from "@/lib/pushServer";
import { bookingRouteText } from "@/lib/bookingRoute";

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

export async function sendNewBookingAdminPush(
  admin: any,
  booking: any,
  source: "B2C" | "B2B" | "OTHER"
) {
  if (!booking?.id) return null;

  const number = compact(booking.booking_number || booking.id, 24);
  const customer = compact(booking.customer_name, 36);
  const date = compact(booking.travel_date, 12);
  const time = compact(String(booking.travel_time || "").slice(0, 5), 5);
  const title = source === "B2B"
    ? "🏢 NOWA REZERWACJA B2B"
    : source === "OTHER"
    ? "🚐 NOWY TRANSPORT A → B"
    : "🔔 NOWA REZERWACJA";

  return sendAdminPush(admin, {
    title,
    body: `${number} · ${customer} · ${date} ${time} · ${compact(bookingRouteText(booking), 90)}${booking.price_quote_required ? " · WYCENA" : money(booking.total_price)}`,
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
