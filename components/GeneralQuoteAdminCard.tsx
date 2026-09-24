"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function quoteStatusLabel(status: unknown) {
  if (status === "accepted") return "✓ ZAAKCEPTOWANA";
  if (status === "rejected") return "✕ ODRZUCONA";
  if (status === "priced") return "WYSŁANA / OCZEKUJE";
  return "DO WYCENY";
}

function expiryLabel(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (!Number.isFinite(date.getTime())) return "—";
  return date.toLocaleString("pl-PL");
}

export default function GeneralQuoteAdminCard({
  booking
}: {
  booking: any;
}) {
  const router = useRouter();
  const priced = ["priced", "accepted"].includes(
    String(booking.quote_status)
  );

  const [amount, setAmount] = useState(
    priced
      ? String(Number(booking.total_price || 0).toFixed(2))
      : ""
  );
  const [paymentMethod, setPaymentMethod] = useState(
    ["cash", "bank_transfer", "online"].includes(
      String(booking.payment_method)
    )
      ? String(booking.payment_method)
      : "cash"
  );
  const [quoteNote, setQuoteNote] = useState(
    String(booking.quote_note || "")
  );
  const [validHours, setValidHours] = useState("24");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    if (busy) return;

    const value = Number(
      String(amount).replace(",", ".")
    );

    if (!Number.isFinite(value) || value <= 0) {
      setMessage("Podaj poprawną cenę końcową.");
      return;
    }

    setBusy(true);
    setMessage("Zapisywanie wyceny...");

    const response = await fetch(
      "/api/admin/general-quote",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          bookingId: booking.id,
          amount: value,
          paymentMethod,
          quoteNote,
          validHours: Number(validHours)
        })
      }
    );

    const data = await response.json();
    setBusy(false);

    if (!response.ok) {
      setMessage(
        data.error ||
          "Nie udało się zapisać wyceny."
      );
      return;
    }

    setMessage(
      data.email_sent
        ? "✓ Wycena zapisana i wysłana klientowi. Czekamy na AKCEPTACJĘ albo REZYGNACJĘ."
        : "✓ Wycena zapisana. E-mail nie został wysłany — sprawdź adres klienta lub logi poczty."
    );

    router.refresh();
  }

  if (booking.quote_status === "accepted") {
    return (
      <section
        className="card"
        style={{
          marginTop: 16,
          borderColor: "#397a50"
        }}
      >
        <span className="badge">
          WYCENA INDYWIDUALNA A → B
        </span>
        <h2 style={{ marginTop: 10 }}>
          ✓ Klient zaakceptował wycenę
        </h2>
        <div className="detail-list">
          <div>
            <span>Cena</span>
            <strong>
              {Number(
                booking.total_price || 0
              ).toFixed(2)} zł
            </strong>
          </div>
          <div>
            <span>Akceptacja</span>
            <strong>
              {booking.quote_accepted_at
                ? new Date(
                    booking.quote_accepted_at
                  ).toLocaleString("pl-PL")
                : "✓ zaakceptowana"}
            </strong>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="card"
      style={{
        marginTop: 16,
        borderColor: "#8f7137"
      }}
    >
      <span className="badge">
        WYCENA INDYWIDUALNA A → B
      </span>

      <div
        className="company-section-head"
        style={{ marginTop: 10 }}
      >
        <div>
          <h2 style={{ marginBottom: 4 }}>
            {booking.quote_status === "priced"
              ? "Wycena oczekuje na decyzję"
              : "Przygotuj cenę"}
          </h2>
          <p
            className="muted"
            style={{ margin: 0 }}
          >
            Klient musi wyraźnie zaakceptować cenę
            albo z niej zrezygnować.
          </p>
        </div>
        <strong>
          {quoteStatusLabel(
            booking.quote_status
          )}
        </strong>
      </div>

      {booking.quote_status === "priced" && (
        <div
          className="detail-list"
          style={{ marginTop: 12 }}
        >
          <div>
            <span>Aktualna cena</span>
            <strong>
              {Number(
                booking.total_price || 0
              ).toFixed(2)} zł
            </strong>
          </div>
          <div>
            <span>Ważna do</span>
            <strong>
              {expiryLabel(
                booking.quote_expires_at
              )}
            </strong>
          </div>
        </div>
      )}

      <div
        className="grid"
        style={{ marginTop: 14 }}
      >
        <label>
          Cena końcowa (zł)
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) =>
              setAmount(e.target.value)
            }
            placeholder="np. 850,00"
          />
        </label>

        <label>
          Sposób płatności
          <select
            value={paymentMethod}
            onChange={(e) =>
              setPaymentMethod(
                e.target.value
              )
            }
          >
            <option value="cash">
              Gotówka u kierowcy
            </option>
            <option value="bank_transfer">
              Przelew tradycyjny
            </option>
            <option value="online">
              Płatność online
            </option>
          </select>
        </label>

        <label>
          Ważność wyceny
          <select
            value={validHours}
            onChange={(e) =>
              setValidHours(
                e.target.value
              )
            }
          >
            <option value="12">12 godzin</option>
            <option value="24">24 godziny</option>
            <option value="48">48 godzin</option>
            <option value="72">72 godziny</option>
          </select>
        </label>
      </div>

      <label style={{ marginTop: 12 }}>
        Wiadomość do klienta (opcjonalnie)
        <textarea
          rows={3}
          value={quoteNote}
          onChange={(e) =>
            setQuoteNote(
              e.target.value
            )
          }
          placeholder="Np. cena obejmuje przejazd tam i z powrotem oraz postój..."
        />
      </label>

      <button
        className="btn"
        style={{
          width: "100%",
          marginTop: 14
        }}
        disabled={busy}
        onClick={save}
      >
        {busy
          ? "ZAPISYWANIE..."
          : booking.quote_status ===
            "priced"
          ? "ZAKTUALIZUJ / WYŚLIJ PONOWNIE"
          : "ZAPISZ WYCENĘ I WYŚLIJ"}
      </button>

      {booking.quote_status ===
        "priced" &&
        !booking.quote_expires_at && (
          <div
            className="booking-error"
            style={{ marginTop: 12 }}
          >
            Ta wycena powstała przed wdrożeniem
            akceptacji online. Wyślij ją ponownie,
            aby klient mógł ją zaakceptować.
          </div>
        )}

      {message && (
        <div
          className="admin-save-message"
          style={{ marginTop: 12 }}
        >
          {message}
        </div>
      )}
    </section>
  );
}
