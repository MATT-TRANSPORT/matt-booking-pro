"use client";
import { useEffect, useState } from "react";

/** Mounted only on the detail page. Rendering/prefetching on the server never marks a booking read. */
export default function BookingReadMarker({ bookingId }: { bookingId: string }) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setFailed(false);
    fetch(`/api/panel/bookings/${bookingId}/read`, { method: "POST", cache: "no-store", keepalive: true })
      .then(response => { if (active) setFailed(!response.ok); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [bookingId, attempt]);
  if (!failed) return null;
  return <div className="card" role="alert">
    Nie udało się zapisać odczytania rezerwacji. Oznaczenie NOWA! może pozostać widoczne.
    <button className="btn secondary" onClick={() => setAttempt(value => value + 1)}>PONÓW ZAPIS</button>
  </div>;
}
