"use client";

import { useEffect, useMemo, useState } from "react";

const STATUS: Record<string, string> = {
  pending: "Oczekuje na potwierdzenie",
  confirmed: "Potwierdzona",
  assigned: "Kierowca przypisany",
  in_progress: "W realizacji",
  arrived: "Kierowca na miejscu",
  picked_up: "Pasażer odebrany",
  completed: "Zakończona",
  cancelled: "Anulowana"
};

function dateTimeKey(date: unknown, time: unknown) {
  const d = String(date || "").slice(0, 10);
  const t = String(time || "00:00").slice(0, 5);
  const value = new Date(`${d}T${t}:00`).getTime();
  return Number.isFinite(value) ? value : 0;
}

function dateLabel(value: unknown) {
  const raw = String(value || "").slice(0, 10);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : raw;
}

function timeLabel(value: unknown) {
  return String(value || "").slice(0, 5);
}

function bookingRoute(b: any) {
  const general = Boolean(b.destination_address) || b.booking_source === "public_general";
  if (general) {
    return `${b.pickup_address || "—"} → ${b.destination_address || b.airport_label || "—"}`;
  }
  if (b.service_type === "from_airport") {
    return `${b.airport_label || "Lotnisko"} → ${b.pickup_address || "—"}`;
  }
  if (b.service_type === "roundtrip") {
    return `${b.pickup_address || "—"} ↔ ${b.airport_label || "Lotnisko"}`;
  }
  return `${b.pickup_address || "—"} → ${b.airport_label || "Lotnisko"}`;
}

function bookingKind(b: any) {
  if (Boolean(b.destination_address) || b.booking_source === "public_general") return "Transport A → B";
  if (b.service_type === "from_airport") return "Odbiór z lotniska";
  if (b.service_type === "roundtrip") return "Transfer w obie strony";
  return "Transfer na lotnisko";
}

function paymentLabel(b: any) {
  const status = String(b.payment_status || "pending");
  if (status === "paid") return "Opłacono";
  if (status === "refunded") return "Zwrot";
  if (status === "review") return "Do weryfikacji";
  if (b.payment_method === "online" || b.online_payment_requested) return "Płatność online";
  if (b.payment_method === "bank_transfer") return "Przelew";
  return "Płatność u kierowcy";
}

export default function CustomerTripsPortal() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/customer-account/me", { cache: "no-store" });
      if (response.status === 401) {
        setData(null);
      } else {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Nie udało się pobrać przejazdów.");
        setData(body);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nie udało się pobrać przejazdów.");
    }
    setLoading(false);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (error === "link") setMessage("Link logowania jest nieprawidłowy, został już użyty albo wygasł. Poproś o nowy link.");
    if (error === "session") setMessage("Nie udało się utworzyć sesji. Poproś o nowy link logowania.");
    load();
  }, []);

  async function requestLink() {
    if (!email.trim()) return;
    setSending(true);
    setMessage("");
    try {
      const response = await fetch("/api/customer-account/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const body = await response.json();
      setMessage(body.message || "Sprawdź swoją skrzynkę e-mail.");
    } catch {
      setMessage("Nie udało się wysłać linku. Spróbuj ponownie za chwilę.");
    }
    setSending(false);
  }

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/customer-account/logout", { method: "POST" }).catch(() => null);
    setData(null);
    setLoggingOut(false);
    setMessage("Wylogowano z Moich przejazdów.");
  }

  const entries = useMemo(() => {
    if (!data) return [] as any[];
    const bookings = (data.bookings || []).map((b: any) => ({
      type: "booking",
      id: b.id,
      status: b.status,
      date: b.travel_date,
      time: b.travel_time,
      sortKey: dateTimeKey(b.travel_date, b.travel_time),
      item: b
    }));
    const weddings = (data.weddings || []).map((w: any) => ({
      type: "wedding",
      id: w.id,
      status: w.status,
      date: w.start_date,
      time: w.start_time,
      sortKey: dateTimeKey(w.start_date, w.start_time),
      item: w
    }));
    return [...bookings, ...weddings];
  }, [data]);

  const now = Date.now();
  const active = entries
    .filter((x: any) => !["completed", "cancelled"].includes(x.status) && x.sortKey >= now)
    .sort((a: any, b: any) => a.sortKey - b.sortKey);
  const history = entries
    .filter((x: any) => ["completed", "cancelled"].includes(x.status) || x.sortKey < now)
    .sort((a: any, b: any) => b.sortKey - a.sortKey);

  function repeat(entry: any) {
    if (entry.type === "wedding") {
      const w = entry.item;
      sessionStorage.setItem("matt_customer_repeat", JSON.stringify({
        kind: "wedding",
        customerName: w.customer_name || "",
        restaurantName: w.restaurant_name || "",
        restaurantAddress: w.restaurant_address || "",
        vehiclesCount: Number(w.vehicles_count || 1),
        phone: w.phone || "",
        email: w.email || data?.email || "",
        notes: w.notes || ""
      }));
      window.location.href = "/wesele?repeat=1";
      return;
    }

    const b = entry.item;
    const general = Boolean(b.destination_address) || b.booking_source === "public_general";
    if (general) {
      sessionStorage.setItem("matt_customer_repeat", JSON.stringify({
        kind: "general",
        origin: b.pickup_address || "",
        destination: b.destination_address || b.airport_label || "",
        roundtrip: b.service_type === "roundtrip",
        passengers: Number(b.passengers || 1),
        vehicleType: b.vehicle_type || "auto",
        category: b.transport_category || "private",
        customerName: b.customer_name || "",
        phone: b.phone || "",
        email: b.email || data?.email || "",
        invoiceRequired: Boolean(b.invoice_required),
        notes: b.notes || ""
      }));
      window.location.href = "/transport?repeat=1";
      return;
    }

    sessionStorage.setItem("matt_customer_repeat", JSON.stringify({
      kind: "airport",
      serviceType: b.service_type || "to_airport",
      address: b.pickup_address || "",
      airport: b.airport_key || "balice",
      vehicle: b.vehicle_type || "car",
      passengers: Number(b.passengers || 1),
      customerName: b.customer_name || "",
      phone: b.phone || "",
      email: b.email || data?.email || "",
      invoiceRequired: Boolean(b.invoice_required),
      companyNip: b.company_nip || "",
      paymentMethod: b.payment_method || "cash",
      notes: b.notes || "",
      additionalStopAddress: b.additional_stop_address || "",
      additionalStopPrimary: Boolean(b.additional_stop_primary),
      additionalStopReturn: Boolean(b.additional_stop_return)
    }));
    window.location.href = "/booking?service=airport&repeat=1";
  }

  function renderEntry(entry: any, next = false) {
    const isWedding = entry.type === "wedding";
    const item = entry.item;
    const title = isWedding ? "Transport weselny" : bookingKind(item);
    const route = isWedding
      ? `${item.restaurant_name || "Wesele"} · ${item.restaurant_address || ""}`
      : bookingRoute(item);
    const number = item.booking_number || "—";
    const pastWithoutFinalStatus = entry.sortKey < now && !["completed", "cancelled"].includes(entry.status);
    const status = pastWithoutFinalStatus ? "Termin minął" : (STATUS[entry.status] || entry.status || "—");

    return <article key={`${entry.type}-${entry.id}`} className={`customer-trip-card${next ? " is-next" : ""}`}>
      <div className="customer-trip-topline">
        <div>
          <span className="customer-trip-kind">{isWedding ? "💍" : "🚐"} {title}</span>
          <strong>{dateLabel(entry.date)} · {timeLabel(entry.time)}</strong>
        </div>
        <span className={`customer-trip-status ${entry.status || "pending"}`}>{status}</span>
      </div>
      <div className="customer-trip-route">{route}</div>
      <div className="customer-trip-meta">
        <span>Nr: <strong>{number}</strong></span>
        {!isWedding && <span>Pasażerowie: <strong>{item.passengers || "—"}</strong></span>}
        {!isWedding && <span>Płatność: <strong>{paymentLabel(item)}</strong></span>}
      </div>
      <div className="customer-trip-actions">
        {!isWedding && item.customer_access_token && <a className="btn secondary" href={`/rezerwacja/${item.customer_access_token}`}>SZCZEGÓŁY</a>}
        <button type="button" className="btn" onClick={() => repeat(entry)}>ZAMÓW PONOWNIE</button>
      </div>
    </article>;
  }

  if (loading) {
    return <main className="container customer-trips-page"><section className="card customer-trips-login"><span className="badge">MATT TRANSPORT</span><h1>Moje przejazdy</h1><p className="muted">Ładowanie…</p></section></main>;
  }

  if (!data) {
    return <main className="container customer-trips-page">
      <a className="back-link" href="/booking">← Wróć do rezerwacji</a>
      <section className="card customer-trips-login">
        <span className="badge">MATT CUSTOMER</span>
        <h1>Moje przejazdy</h1>
        <p className="muted">Bez hasła. Podaj e-mail użyty przy prywatnej rezerwacji, a wyślemy jednorazowy link do Twoich przejazdów.</p>
        <label>Adres e-mail
          <input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => { if (e.key === "Enter") requestLink(); }} placeholder="np. jan@firma.pl" />
        </label>
        <button className="btn" disabled={sending || !email.trim()} onClick={requestLink}>{sending ? "WYSYŁANIE…" : "WYŚLIJ LINK DO LOGOWANIA"}</button>
        {message && <div className="customer-trips-message">{message}</div>}
        <small className="muted">Dla bezpieczeństwa link działa tylko raz i wygasa po 15 minutach. Konto pokazuje wyłącznie prywatne rezerwacje B2C — rezerwacje firmowe B2B pozostają w panelu firmy.</small>
      </section>
    </main>;
  }

  return <main className="container customer-trips-page">
    <div className="customer-trips-header">
      <div><span className="badge">MATT CUSTOMER</span><h1>Moje przejazdy</h1><p className="muted">{data.email}</p></div>
      <div className="customer-trips-header-actions"><a className="btn secondary" href="/booking">+ NOWA REZERWACJA</a><button className="btn secondary" disabled={loggingOut} onClick={logout}>{loggingOut ? "…" : "WYLOGUJ"}</button></div>
    </div>

    {message && <div className="customer-trips-message">{message}</div>}

    {active.length > 0 && <section className="customer-trips-section">
      <div className="customer-trips-section-head"><div><span className="badge">NAJBLIŻSZY TRANSPORT</span><h2>Twój następny przejazd</h2></div><span>{active.length} aktywne</span></div>
      {renderEntry(active[0], true)}
      {active.length > 1 && <div className="customer-trips-list">{active.slice(1).map((entry: any) => renderEntry(entry))}</div>}
    </section>}

    {active.length === 0 && <section className="card customer-trips-empty"><h2>Brak zaplanowanych przejazdów</h2><p className="muted">Możesz od razu zamówić kolejny transport.</p><a className="btn" href="/booking">ZAMÓW TRANSPORT</a></section>}

    {history.length > 0 && <section className="customer-trips-section customer-trips-history">
      <div className="customer-trips-history-separator"><span>HISTORIA · ZAKOŃCZONE / ANULOWANE / TERMIN MINĄŁ</span></div>
      <div className="customer-trips-list">{history.map((entry: any) => renderEntry(entry))}</div>
    </section>}
  </main>;
}
