"use client";

import { useMemo, useState } from "react";

type ReferenceOption = {
  key: string;
  type: "booking" | "wedding";
  id: string;
  label: string;
  email?: string | null;
  amount?: number | null;
};

export default function AdminStripePaymentLauncher({
  references,
  recent
}: {
  references: ReferenceOption[];
  recent: any[];
}) {
  const [referenceKey, setReferenceKey] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("auto");
  const [customerEmail, setCustomerEmail] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState("");

  const selected = useMemo(
    () => references.find((item) => item.key === referenceKey) || null,
    [references, referenceKey]
  );

  function selectReference(value: string) {
    setReferenceKey(value);
    setCheckoutUrl("");

    const item = references.find((row) => row.key === value);
    if (!item) return;

    if (item.amount && item.amount > 0) {
      setAmount(item.amount.toFixed(2).replace(".", ","));
    }

    setCustomerEmail(item.email || "");
    setDescription(item.label);
  }

  async function createPayment() {
    if (busy) return;

    setBusy(true);
    setMessage("");
    setCheckoutUrl("");

    const popup = window.open("", "_blank");

    try {
      const response = await fetch("/api/admin/stripe-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          paymentMethod,
          customerEmail,
          description,
          bookingId: selected?.type === "booking" ? selected.id : null,
          weddingBookingId: selected?.type === "wedding" ? selected.id : null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        popup?.close();
        throw new Error(data.error || "Nie udało się utworzyć płatności.");
      }

      setCheckoutUrl(data.url || "");
      setMessage("✓ Płatność Stripe została utworzona.");

      if (data.url && popup) {
        popup.location.href = data.url;
      } else if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Nie udało się utworzyć płatności."
      );
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!checkoutUrl) return;
    await navigator.clipboard.writeText(checkoutUrl);
    setMessage("✓ Link płatności skopiowany.");
  }

  return (
    <>
      <section className="card admin-stripe-launcher">
        <div className="company-section-head">
          <div>
            <span className="badge">STRIPE</span>
            <h2>Uruchom płatność</h2>
            <p className="muted">
              Wybierz zlecenie, kwotę i metodę. Możesz też utworzyć płatność bez przypisania do rezerwacji.
            </p>
          </div>
        </div>

        <div className="admin-stripe-grid">
          <label>
            Zlecenie
            <select value={referenceKey} onChange={(e) => selectReference(e.target.value)}>
              <option value="">— bez przypisania —</option>
              {references.map((item) => (
                <option value={item.key} key={item.key}>{item.label}</option>
              ))}
            </select>
          </label>

          <label>
            Kwota PLN
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="np. 390,00"
            />
          </label>

          <label>
            Metoda płatności
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="auto">Automatycznie — metody aktywne w Stripe</option>
              <option value="card">Karta</option>
              <option value="blik">BLIK</option>
              <option value="p24">Przelewy24</option>
            </select>
          </label>

          <label>
            E-mail klienta
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="opcjonalnie"
            />
          </label>
        </div>

        <label className="admin-stripe-description">
          Opis
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="np. zaliczka za transport"
          />
        </label>

        <div className="admin-stripe-actions">
          <button className="btn" type="button" disabled={busy} onClick={createPayment}>
            {busy ? "TWORZENIE..." : "💳 URUCHOM PŁATNOŚĆ STRIPE"}
          </button>
          {checkoutUrl && (
            <>
              <a className="btn secondary" href={checkoutUrl} target="_blank" rel="noreferrer">
                OTWÓRZ PŁATNOŚĆ
              </a>
              <button className="btn secondary" type="button" onClick={copyLink}>
                KOPIUJ LINK
              </button>
            </>
          )}
        </div>

        <p className="muted admin-stripe-note">
          BLIK i Przelewy24 zadziałają, jeśli są aktywne na koncie Stripe. Opcja „Automatycznie” pozwala Stripe pokazać dostępne metody.
        </p>

        {message && <div className="admin-save-message">{message}</div>}
      </section>

      <section className="card admin-stripe-history">
        <div className="company-section-head">
          <div><h2>Ostatnie płatności uruchomione z panelu</h2></div>
          <strong>{recent.length}</strong>
        </div>

        {!recent.length ? (
          <p className="muted">Nie uruchamiano jeszcze płatności z tego narzędzia.</p>
        ) : (
          <div className="admin-stripe-history-list">
            {recent.map((payment) => (
              <div key={payment.id}>
                <span>
                  <strong>{(Number(payment.amount_cents || 0) / 100).toFixed(2)} zł</strong>
                  <small>{payment.description || "Płatność MATT TRANSPORT"}</small>
                </span>
                <b className={`admin-stripe-status ${payment.status || "pending"}`}>
                  {payment.status === "succeeded"
                    ? "OPŁACONO"
                    : payment.status === "refunded"
                    ? "ZWROT"
                    : payment.status === "failed"
                    ? "BŁĄD"
                    : "OCZEKUJE"}
                </b>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
