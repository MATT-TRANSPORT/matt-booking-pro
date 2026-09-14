"use client";

import { useEffect, useState } from "react";

export default function B2BEmployeePayment({ token }: { token: string }) {
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const paymentResult = query.get("payment");

    if (paymentResult === "success") {
      setMessage("Płatność została przyjęta. Sprawdzamy status… / Payment received. Checking status…");
    } else if (paymentResult === "cancelled") {
      setMessage("Płatność została przerwana. Możesz spróbować ponownie. / Payment was cancelled. You can try again.");
    }

    refresh();
  }, [token]);

  async function refresh() {
    try {
      const response = await fetch(`/api/payments/company-employee/${token}`, {
        cache: "no-store"
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Nie udało się odczytać płatności. / Unable to load payment.");
        setLoading(false);
        return;
      }
      setBooking(data.booking);
      setLoading(false);
    } catch {
      setMessage("Nie udało się połączyć z systemem płatności. / Unable to connect to the payment system.");
      setLoading(false);
    }
  }

  async function pay() {
    if (busy) return;
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(`/api/payments/company-employee/${token}`, {
        method: "POST"
      });
      const data = await response.json();
      if (!response.ok || !data.url) {
        throw new Error(data.error || "Nie udało się rozpocząć płatności. / Unable to start payment.");
      }
      window.location.href = data.url;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nie udało się rozpocząć płatności. / Unable to start payment.");
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="container client-portal-shell">
        <div className="card"><h1>Ładowanie płatności… / Loading payment…</h1></div>
      </main>
    );
  }

  if (!booking) {
    return (
      <main className="container client-portal-shell">
        <div className="card">
          <span className="badge">MATT TRANSPORT</span>
          <h1>Płatność online / Online payment</h1>
          {message && <div className="booking-error">{message}</div>}
          <a className="btn secondary" href="tel:+48691242691">📞 MATT TRANSPORT</a>
        </div>
      </main>
    );
  }

  const paid = booking.payment_status === "paid";
  const review = booking.payment_status === "review";
  const refunded = booking.payment_status === "refunded";
  const canPay = ["confirmed", "assigned"].includes(String(booking.booking_status || "")) && !paid && !review && !refunded;

  return (
    <main className="container client-portal-shell">
      <div className="card client-portal-hero">
        <span className="badge">MATT TRANSPORT</span>
        <h1>Płatność firmowa online</h1>
        <div className="muted">Company online payment</div>
      </div>

      <div className="client-portal-grid">
        <section className="card">
          <h2>Rezerwacja / Booking {booking.booking_number}</h2>
          <div className="grid">
            <div><small className="muted">PASAŻER / PASSENGER</small><br/><strong>{booking.customer_name || "—"}</strong></div>
            <div><small className="muted">TERMIN / DATE & TIME</small><br/><strong>{booking.travel_date} · {booking.travel_time}</strong></div>
            <div><small className="muted">TRASA / ROUTE</small><br/><strong>{booking.pickup_address} → {booking.airport_label}</strong></div>
            {booking.return_date && <div><small className="muted">POWRÓT / RETURN</small><br/><strong>{booking.return_date} · {booking.return_time || "—"}</strong></div>}
          </div>

          {paid ? (
            <div className="online-payment-success" style={{marginTop:18}}>✓ Płatność została zaksięgowana. / Payment received.</div>
          ) : review ? (
            <div className="online-payment-warning" style={{marginTop:18}}>⚠ Płatność wymaga weryfikacji przez MATT TRANSPORT. / Payment requires verification by MATT TRANSPORT.</div>
          ) : refunded ? (
            <div className="online-payment-info" style={{marginTop:18}}>↩ Zarejestrowano zwrot. / This payment has been refunded.</div>
          ) : !canPay ? (
            <div className="online-payment-info" style={{marginTop:18}}>Płatność będzie dostępna po potwierdzeniu rezerwacji. / Payment will be available after the booking is confirmed.</div>
          ) : (
            <>
              <div style={{marginTop:20,padding:18,border:"1px solid #4f4733",borderRadius:14}}>
                <div className="muted">DO ZAPŁATY / AMOUNT DUE</div>
                <div style={{fontSize:30,fontWeight:900,marginTop:6}}>{Number(booking.amount || 0).toFixed(2)} zł</div>
              </div>
              <button className="btn" style={{width:"100%",marginTop:18}} disabled={busy} onClick={pay}>
                {busy ? "PRZECHODZĘ DO PŁATNOŚCI… / OPENING PAYMENT…" : "💳 OPŁAĆ ONLINE / PAY ONLINE"}
              </button>
              <p className="muted" style={{marginTop:10}}>
                Płatność jest obsługiwana przez Stripe. / Payment is securely processed by Stripe.
              </p>
            </>
          )}

          {message && <div className={paid ? "online-payment-success" : "online-payment-message"} style={{marginTop:16}}>{message}</div>}
        </section>

        <aside className="card">
          <h2>Kontakt / Contact</h2>
          <p className="muted">W razie pytań dotyczących transportu lub płatności skontaktuj się z MATT TRANSPORT.<br/>For transport or payment questions, contact MATT TRANSPORT.</p>
          <a className="btn secondary" href="tel:+48691242691">📞 +48 691 242 691</a>
          <a className="btn secondary" style={{marginTop:10}} href="mailto:kontakt@matt-transport.pl">✉ kontakt@matt-transport.pl</a>
        </aside>
      </div>
    </main>
  );
}
