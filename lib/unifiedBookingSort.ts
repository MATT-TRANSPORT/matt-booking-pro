import { bookingLegs, dispatcherSortKey, warsawNowKey } from "@/lib/dispatcherOps";

export function isClosedBooking(booking: any) {
  return ["completed", "cancelled"].includes(String(booking?.status || ""));
}

export function bookingHistoryKey(booking: any) {
  const legs = bookingLegs(booking);
  const last = legs[legs.length - 1];
  if (last?.key) return last.key;
  return `${String(booking?.travel_date || "0000-00-00").slice(0, 10)}T${String(booking?.travel_time || "00:00").slice(0, 5)}`;
}

export function unifiedBookingSort(a: any, b: any, nowKey = warsawNowKey()) {
  const aClosed = isClosedBooking(a);
  const bClosed = isClosedBooking(b);

  if (aClosed !== bClosed) return aClosed ? 1 : -1;

  if (!aClosed) {
    return dispatcherSortKey(a, nowKey).localeCompare(dispatcherSortKey(b, nowKey));
  }

  return bookingHistoryKey(b).localeCompare(bookingHistoryKey(a));
}

export function splitUnifiedBookings(bookings: any[], nowKey = warsawNowKey()) {
  const sorted = [...bookings].sort((a, b) => unifiedBookingSort(a, b, nowKey));
  return {
    active: sorted.filter((x) => !isClosedBooking(x)),
    history: sorted.filter(isClosedBooking),
    all: sorted
  };
}
