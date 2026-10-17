"use client";
import { customerText } from "@/lib/customerCopy";
import { useCustomerLocale } from "@/lib/useCustomerLocale";

import { useEffect, useState } from "react";
import { paymentBookingStatusAllowed } from "@/lib/payment";

export default function B2BEmployeePayment({ token }: { token: string }) {
  const [booking, setBooking] = useState<any>(null);
  const locale = useCustomerLocale(booking?.customer_locale);
  const t = (key: string) => customerText(key.split(" / ")[0], locale);
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
        setMessage(data.error || t("Nie udało się odczytać płatności."));
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
        throw new Error(data.error || t("Nie udało się rozpocząć płatności."));
      }
      window.location.href = data.url;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("Nie udało się rozpocząć płatności."));
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="container client-portal-shell">
        <div className="card"><h1>{t("Ładowanie płatności…")}</h1></div>
      </main>
    );
  }

  if (!booking) {
    return (
      <main className="container client-portal-shell">
        <div className="card">
          <span className="badge">MATT TRANSPORT</span>
          <h1>{t("Płatność online")}</h1>
          {message && <div className="booking-error">{t(message)}</div>}
          <a className="btn secondary" href="tel:+48691242691">📞 MATT TRANSPORT</a>
        </div>
      </main>
    );
  }

  const paid = booking.payment_status === "paid";
  const review = booking.payment_status === "review";
  const refunded = booking.payment_status === "refunded";
  const canPay = paymentBookingStatusAllowed(booking.booking_status) && !paid && !review && !refunded;

  return (
    <main className="container client-portal-shell">
      <div className="card client-portal-hero">
        <span className="badge">MATT TRANSPORT</span>
        <h1>{t("Płatność firmowa online")}</h1>

      </div>

      <div className="client-portal-grid">
        <section className="card">
          <h2>{t("Rezerwacja")} {booking.booking_number}</h2>
          <div className="grid">
            <div><small className="muted">{t("PASAŻER")}</small><br/><strong>{booking.customer_name || "—"}</strong></div>
            <div><small className="muted">{t("TERMIN")}</small><br/><strong>{booking.travel_date} · {booking.travel_time}</strong></div>
            <div><small className="muted">{t("TRASA")}</small><br/><strong>{booking.pickup_address} → {booking.airport_label}</strong></div>
            {booking.return_date && <div><small className="muted">{t("POWRÓT")}</small><br/><strong>{booking.return_date} · {booking.return_time || "—"}</strong></div>}
          </div>

          {paid ? (
            <div className="online-payment-success" style={{marginTop:18}}>{t("✓ Płatność została zaksięgowana.")}</div>
          ) : review ? (
            <div className="online-payment-warning" style={{marginTop:18}}>{t("⚠ Płatność wymaga weryfikacji przez MATT TRANSPORT.")}</div>
          ) : refunded ? (
            <div className="online-payment-info" style={{marginTop:18}}>{t("↩ Zarejestrowano zwrot.")}</div>
          ) : !canPay ? (
            <div className="online-payment-info" style={{marginTop:18}}>{t("Płatność jest niedostępna dla aktualnego statusu rezerwacji.")}</div>
          ) : (
            <>
              <div style={{marginTop:20,padding:18,border:"1px solid #4f4733",borderRadius:14}}>
                <div className="muted">{t("DO ZAPŁATY")}</div>
                <div style={{fontSize:30,fontWeight:900,marginTop:6}}>{Number(booking.amount || 0).toFixed(2)} zł</div>
              </div>
              <button className="btn" style={{width:"100%",marginTop:18}} disabled={busy} onClick={pay}>
                {busy ? t("PRZECHODZĘ DO PŁATNOŚCI…") : t("💳 OPŁAĆ ONLINE")}
              </button>
              <p className="muted" style={{marginTop:10}}>

                {t("Płatność jest obsługiwana przez Stripe.")}</p>
            </>
          )}

          {message && <div className={paid ? "online-payment-success" : "online-payment-message"} style={{marginTop:16}}>{t(message)}</div>}
        </section>

        <aside className="card" style={{display:"flex",flexDirection:"column",gap:10}}>
          <h2>{t("Kontakt")}</h2>
          <p className="muted">{t("W razie pytań dotyczących transportu lub płatności skontaktuj się z MATT TRANSPORT.")}<br/></p>
          <a className="btn secondary" style={{whiteSpace:"normal",overflowWrap:"anywhere",textAlign:"center"}} href="tel:+48691242691">📞 +48 691 242 691</a>
          <a className="btn secondary" style={{whiteSpace:"normal",overflowWrap:"anywhere",textAlign:"center"}} href="mailto:kontakt@matt-transport.pl">✉ kontakt@matt-transport.pl</a>
        </aside>
      </div>
    </main>
  );
}
