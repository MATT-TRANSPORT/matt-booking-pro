"use client";

import { useEffect, useState } from "react";
import OnlinePaymentCard from "@/components/OnlinePaymentCard";
import CustomerPushControls from "@/components/CustomerPushControls";
import { companyBookingMoney } from "@/lib/companyPortal";

const STATUS: Record<string, string> = {
  pending: "Oczekuje na potwierdzenie",
  confirmed: "Potwierdzona",
  assigned: "Kierowca przypisany",
  in_progress: "Kierowca w drodze",
  arrived: "Kierowca na miejscu",
  picked_up: "Pasażer odebrany",
  completed: "Zakończona",
  cancelled: "Anulowana"
};

function paymentLabel(booking: any) {
  if (booking.payment_method === "online") {
    return "Płatność online";
  }
  if (booking.payment_method === "bank_transfer") {
    return "Przelew tradycyjny";
  }
  return "Gotówka u kierowcy";
}

function quoteExpiryLabel(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  if (!Number.isFinite(date.getTime())) return null;
  return date.toLocaleString("pl-PL");
}

function quoteExpired(booking: any) {
  if (!booking.quote_expires_at) return false;
  const time = new Date(booking.quote_expires_at).getTime();
  return Number.isFinite(time) && Date.now() > time;
}

function quoteHeroStatus(booking: any) {
  if (booking.quote_status === "rejected") {
    return "Zrezygnowano z wyceny";
  }
  if (booking.quote_status === "accepted") {
    return STATUS[booking.status] || booking.status;
  }
  if (booking.quote_status === "priced") {
    return quoteExpired(booking)
      ? "Wycena wygasła"
      : "Wycena gotowa — czeka na decyzję";
  }
  return "Wycena w przygotowaniu";
}

export default function ClientBookingPortal({
  token
}: {
  token: string;
}) {
  const [data, setData] = useState<any>(null);
  const [form, setForm] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] =
    useState(false);
  const [quoteBusy, setQuoteBusy] = useState("");
  const [showRejectConfirm, setShowRejectConfirm] =
    useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetch(`/api/client-booking/${token}`)
      .then((r) =>
        r.json().then((d) => ({
          ok: r.ok,
          d
        }))
      )
      .then(({ ok, d }) => {
        if (!ok) {
          setMessage(
            d.error ||
              "Nie znaleziono rezerwacji."
          );
          return;
        }

        setData(d);
        const b = d.booking;

        setForm({
          pickupAddress:
            b.pickup_address || "",
          travelDate:
            b.travel_date || "",
          travelTime:
            b.travel_time || "",
          returnDate:
            b.return_date || "",
          returnTime:
            b.return_time || "",
          flightNumber:
            b.flight_number || "",
          returnFlightNumber:
            b.return_flight_number || "",
          passengers:
            b.passengers || 1,
          vehicleType:
            b.vehicle_type || "car",
          invoiceRequired:
            !!b.invoice_required,
          companyNip:
            b.company_nip || "",
          notes:
            b.notes || ""
        });
      });
  }, [token]);

  async function save() {
    setSaving(true);
    setMessage("");

    const response = await fetch(
      `/api/client-booking/${token}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify(form)
      }
    );

    const result = await response.json();

    if (!response.ok) {
      setMessage(
        result.error ||
          "Nie udało się zapisać zmian."
      );
      setSaving(false);
      return;
    }

    setData((old: any) => ({
      ...old,
      booking: result.booking,
      editable: true
    }));

    setMessage(
      result.requiresReconfirmation
        ? "Zmiany zapisane. Rezerwacja oczekuje teraz na ponowne potwierdzenie przez MATT TRANSPORT."
        : "Zmiany zostały zapisane."
    );

    setSaving(false);
    setEditing(false);
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  async function decideQuote(
    action: "accept" | "reject"
  ) {
    if (quoteBusy) return;

    setQuoteBusy(action);
    setMessage("");

    try {
      const response = await fetch(
        `/api/client-booking/${token}/quote`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            action
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setMessage(
          result.error ||
            "Nie udało się zapisać decyzji."
        );
        setQuoteBusy("");
        return;
      }

      setData((old: any) => ({
        ...old,
        booking: result.booking,
        editable: false,
        cancellable:
          action === "accept"
      }));

      setShowRejectConfirm(false);

      setMessage(
        action === "accept"
          ? result.booking.payment_method ===
            "online"
            ? "✓ Wycena zaakceptowana. Rezerwacja została potwierdzona — możesz teraz opłacić ją online."
            : "✓ Wycena zaakceptowana. Rezerwacja została potwierdzona."
          : "Rezygnacja została zapisana. Transport nie będzie realizowany."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    } catch {
      setMessage(
        "Nie udało się zapisać decyzji. Spróbuj ponownie lub zadzwoń: +48 691 242 691."
      );
    }

    setQuoteBusy("");
  }

  async function cancelBooking() {
    if (cancelling) return;

    setCancelling(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/client-booking/${token}`,
        { method: "DELETE" }
      );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result.error ||
            "Nie udało się anulować rezerwacji."
        );
        setCancelling(false);
        return;
      }

      setData((old: any) => ({
        ...old,
        booking: result.booking,
        editable: false,
        cancellable: false
      }));

      setShowCancelConfirm(false);

      setMessage(
        result.payment_requires_review
          ? "Rezerwacja została anulowana. Ponieważ była już opłacona, MATT TRANSPORT zweryfikuje ewentualny zwrot zgodnie z warunkami anulacji."
          : "Rezerwacja została anulowana. Potwierdzenie zostało wysłane e-mailem."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    } catch {
      setMessage(
        "Nie udało się anulować rezerwacji. Spróbuj ponownie lub zadzwoń: +48 691 242 691."
      );
    }

    setCancelling(false);
  }

  if (message && !data) {
    return (
      <main className="container client-portal-shell">
        <div className="card">
          <h1>Twoja rezerwacja</h1>
          <div className="booking-error">
            {message}
          </div>
        </div>
      </main>
    );
  }

  if (!data || !form) {
    return (
      <main className="container client-portal-shell">
        <div className="card">
          <h1>
            Ładowanie rezerwacji…
          </h1>
        </div>
      </main>
    );
  }

  const b = data.booking;
  const general =
    Boolean(b.destination_address) ||
    b.booking_source ===
      "public_general";
  const editable =
    !general &&
    data.editable &&
    ![
      "in_progress",
      "arrived",
      "picked_up",
      "completed",
      "cancelled"
    ].includes(b.status);

  const acceptedGeneral =
    general &&
    b.quote_status === "accepted";

  const cancellable =
    (data.cancellable ??
      data.editable) &&
    ["pending", "confirmed", "assigned"].includes(
      b.status
    ) &&
    (!general || acceptedGeneral);

  const paidBooking =
    b.payment_status === "paid" ||
    b.payment_status === "review";

  const driver =
    Array.isArray(b.drivers)
      ? b.drivers[0]
      : b.drivers;
  const vehicle =
    Array.isArray(b.vehicles)
      ? b.vehicles[0]
      : b.vehicles;
  const b2bMoney = b.company_id
    ? companyBookingMoney(b)
    : null;

  const expired =
    general && quoteExpired(b);
  const expiry =
    quoteExpiryLabel(
      b.quote_expires_at
    );

  return (
    <main className="container client-portal-shell">
      <div className="card client-portal-hero">
        <span className="badge">MATT TRANSPORT</span>
        <h1>Rezerwacja {b.booking_number}</h1>
        <p className="muted">
          {general
            ? "Transport A → B · wycena indywidualna"
            : `Szczegóły rezerwacji${editable ? " oraz możliwość edycji danych." : "."}`}
        </p>
      </div>

      <section className="card client-priority-actions">
        <div className="client-priority-head">
          <div>
            <span className="badge">NAJWAŻNIEJSZE</span>
            <h2>Co chcesz zrobić?</h2>
          </div>
          <span className="client-priority-number">{b.booking_number}</span>
        </div>

        {general && b.quote_status === "priced" && !expired && (
          <div className="client-quote-actions-top">
            <p>
              Wycena: <strong>{Number(b.total_price || 0).toFixed(2)} zł</strong>
              {" · "}ważna do {expiry}
            </p>
            <p className="muted">
              Akceptacja oznacza zamówienie transportu z obowiązkiem zapłaty.
            </p>
            <button type="button" className="btn individual-quote-accept" disabled={Boolean(quoteBusy)} onClick={() => decideQuote("accept")}>
              {quoteBusy === "accept" ? "ZAPISYWANIE..." : `✓ AKCEPTUJĘ I ZAMAWIAM · ${Number(b.total_price || 0).toFixed(2)} ZŁ`}
            </button>
            {!showRejectConfirm ? (
              <button type="button" className="btn secondary individual-quote-reject" disabled={Boolean(quoteBusy)} onClick={() => setShowRejectConfirm(true)}>
                ANULUJ / REZYGNUJĘ Z WYCENY
              </button>
            ) : (
              <div className="individual-quote-reject-confirm">
                <strong>Czy na pewno zrezygnować z wyceny?</strong>
                <p className="muted">Zlecenie zostanie anulowane i nie będzie realizowane.</p>
                <div>
                  <button type="button" className="btn secondary" onClick={() => setShowRejectConfirm(false)} disabled={Boolean(quoteBusy)}>WRÓĆ</button>
                  <button type="button" className="btn" onClick={() => decideQuote("reject")} disabled={Boolean(quoteBusy)}>
                    {quoteBusy === "reject" ? "ZAPISYWANIE..." : "TAK, ANULUJ"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {general && b.quote_status === "accepted" && (
          <div className="client-action-row">
            <div>
              <strong>✓ Zamówienie jest zaakceptowane</strong>
              <span className="muted">Rezerwacja została potwierdzona.</span>
            </div>
            {cancellable && !showCancelConfirm && (
              <button type="button" className="btn secondary client-top-cancel" disabled={saving || cancelling} onClick={() => setShowCancelConfirm(true)}>
                ANULUJ REZERWACJĘ
              </button>
            )}
          </div>
        )}

        {!general && (
          <div className="client-action-row">
            <div>
              <strong>{editing ? "Edycja rezerwacji jest aktywna" : "Zarządzaj rezerwacją"}</strong>
              <span className="muted">
                {editing ? "Po zakończeniu zmian zapisz je na dole formularza." : "Najważniejsze działania są dostępne tutaj."}
              </span>
            </div>
            <div className="client-action-buttons">
              {editable && (
                <button type="button" className="btn" onClick={() => setEditing((value) => !value)} disabled={saving || cancelling}>
                  {editing ? "✕ ZAKOŃCZ EDYCJĘ" : "✎ EDYTUJ REZERWACJĘ"}
                </button>
              )}
              {cancellable && !showCancelConfirm && (
                <button type="button" className="btn secondary client-top-cancel" disabled={saving || cancelling} onClick={() => setShowCancelConfirm(true)}>
                  ANULUJ REZERWACJĘ
                </button>
              )}
            </div>
          </div>
        )}

        {showCancelConfirm && (
          <div className="client-top-cancel-confirm">
            <strong>Czy na pewno chcesz anulować rezerwację?</strong>
            <p className="muted">
              Kurs zostanie oznaczony jako anulowany. Jeśli rezerwacja była opłacona, MATT TRANSPORT zweryfikuje ewentualny zwrot.
            </p>
            <div>
              <button type="button" className="btn secondary" onClick={() => setShowCancelConfirm(false)} disabled={cancelling}>NIE, ZOSTAW</button>
              <button type="button" className="btn client-danger-btn" onClick={cancelBooking} disabled={cancelling}>
                {cancelling ? "ANULOWANIE..." : "TAK, ANULUJ"}
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="card client-status-card">
        <div>
          <span className="badge">STATUS REZERWACJI</span>
          <h2>{general ? quoteHeroStatus(b) : STATUS[b.status] || b.status}</h2>
        </div>
        <div className={`client-booking-status ${b.status}`}>
          {general ? quoteHeroStatus(b) : STATUS[b.status] || b.status}
        </div>
      </section>

      <div className="client-portal-grid">
        <section className="card">
          <h2>Szczegóły przejazdu</h2>
          {editable && <p className="muted client-edit-hint">{editing ? "Edytujesz dane rezerwacji." : "Dane są zablokowane do edycji. Kliknij „EDYTUJ REZERWACJĘ” powyżej, aby je zmienić."}</p>}

          {general ? (
            <div className="grid">
              <div>
                <small className="muted">
                  PUNKT A
                </small>
                <br />
                <strong>
                  {b.pickup_address}
                </strong>
              </div>
              <div>
                <small className="muted">
                  PUNKT B
                </small>
                <br />
                <strong>
                  {b.destination_address ||
                    b.airport_label}
                </strong>
              </div>
              <div>
                <small className="muted">
                  WYJAZD
                </small>
                <br />
                <strong>
                  {b.travel_date} ·{" "}
                  {String(
                    b.travel_time || ""
                  ).slice(0, 5)}
                </strong>
              </div>
              {b.return_date && (
                <div>
                  <small className="muted">
                    POWRÓT
                  </small>
                  <br />
                  <strong>
                    {b.return_date} ·{" "}
                    {String(
                      b.return_time || ""
                    ).slice(0, 5)}
                  </strong>
                </div>
              )}
              <div>
                <small className="muted">
                  PASAŻEROWIE
                </small>
                <br />
                <strong>
                  {b.passengers}
                </strong>
              </div>
              <div>
                <small className="muted">
                  DYSTANS A→B
                </small>
                <br />
                <strong>
                  {Number(
                    b.distance_km || 0
                  ).toFixed(1)} km
                </strong>
              </div>
            </div>
          ) : (
            <>
              <div className="grid">
                <label>
                  Adres
                  <input
                    disabled={!editable || !editing}
                    value={
                      form.pickupAddress
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        pickupAddress:
                          e.target.value
                      })
                    }
                  />
                </label>

                <label>
                  Data
                  <input
                    disabled={!editable || !editing}
                    type="date"
                    value={
                      form.travelDate
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        travelDate:
                          e.target.value
                      })
                    }
                  />
                </label>

                <label>
                  {b.service_type ===
                  "from_airport"
                    ? "Godzina przylotu"
                    : "Godzina wyjazdu na lotnisko"}
                  <input
                    disabled={!editable || !editing}
                    type="time"
                    value={
                      form.travelTime
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        travelTime:
                          e.target.value
                      })
                    }
                  />
                </label>

                <label>
                  Numer lotu
                  <input
                    disabled={!editable || !editing}
                    value={
                      form.flightNumber
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        flightNumber:
                          e.target.value
                      })
                    }
                  />
                </label>

                <label>
                  Pasażerowie
                  <select
                    disabled={!editable || !editing}
                    value={
                      form.passengers
                    }
                    onChange={(e) => {
                      const passengers =
                        Number(
                          e.target.value
                        );
                      setForm({
                        ...form,
                        passengers,
                        vehicleType:
                          passengers > 3
                            ? "bus"
                            : form.vehicleType
                      });
                    }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(
                      (number) => (
                        <option
                          key={number}
                        >
                          {number}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label>
                  Pojazd
                  <select
                    disabled={!editable || !editing}
                    value={
                      form.vehicleType
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        vehicleType:
                          e.target.value
                      })
                    }
                  >
                    <option
                      value="car"
                      disabled={
                        form.passengers > 3
                      }
                    >
                      Samochód osobowy
                    </option>
                    <option value="bus">
                      Bus do 8 osób
                    </option>
                  </select>
                </label>

                {b.service_type ===
                  "roundtrip" && (
                  <>
                    <label>
                      Data powrotu
                      <input
                        disabled={!editable || !editing}
                        type="date"
                        value={
                          form.returnDate
                        }
                        onChange={(e) =>
                          setForm({
                            ...form,
                            returnDate:
                              e.target.value
                          })
                        }
                      />
                    </label>
                    <label>
                      Godzina przylotu
                      powrotnego
                      <input
                        disabled={!editable || !editing}
                        type="time"
                        value={
                          form.returnTime
                        }
                        onChange={(e) =>
                          setForm({
                            ...form,
                            returnTime:
                              e.target.value
                          })
                        }
                      />
                    </label>
                    <label>
                      Lot powrotny
                      <input
                        disabled={!editable || !editing}
                        value={
                          form.returnFlightNumber
                        }
                        onChange={(e) =>
                          setForm({
                            ...form,
                            returnFlightNumber:
                              e.target.value
                          })
                        }
                      />
                    </label>
                  </>
                )}
              </div>

              <label
                style={{ marginTop: 14 }}
              >
                Uwagi
                <textarea
                  disabled={!editable || !editing}
                  rows={4}
                  value={form.notes}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      notes:
                        e.target.value
                    })
                  }
                />
              </label>

              {b.company_id ? (
                <div
                  style={{
                    marginTop: 14,
                    padding: 12,
                    border:
                      "1px solid #4f4733",
                    borderRadius: 10
                  }}
                >
                  <strong>
                    Rozliczenie firmowe
                    B2B
                  </strong>
                  <div className="muted">
                    Ceny netto + VAT 8%.
                    Ustawień faktury nie
                    zmienia się z linku
                    pasażera.
                  </div>
                </div>
              ) : (
                <div
                  className="grid"
                  style={{
                    marginTop: 14
                  }}
                >
                  <label>
                    Faktura VAT
                    <select
                      disabled={!editable || !editing}
                      value={
                        form.invoiceRequired
                          ? "1"
                          : "0"
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          invoiceRequired:
                            e.target
                              .value ===
                            "1"
                        })
                      }
                    >
                      <option value="0">
                        Nie
                      </option>
                      <option value="1">
                        Tak
                      </option>
                    </select>
                  </label>

                  {form.invoiceRequired && (
                    <label>
                      NIP
                      <input
                        disabled={!editable || !editing}
                        inputMode="numeric"
                        maxLength={10}
                        value={
                          form.companyNip
                        }
                        onChange={(e) =>
                          setForm({
                            ...form,
                            companyNip:
                              e.target.value
                                .replace(
                                  /\D/g,
                                  ""
                                )
                                .slice(
                                  0,
                                  10
                                )
                          })
                        }
                      />
                    </label>
                  )}
                </div>
              )}
            </>
          )}

          {general &&
            b.notes && (
              <div
                style={{
                  marginTop: 16
                }}
              >
                <small className="muted">
                  UWAGI
                </small>
                <p>{b.notes}</p>
              </div>
            )}

          {general && (
            <div
              className={`individual-quote-decision ${String(
                b.quote_status || "pending"
              )}`}
            >
              {b.quote_status ===
                "pending" && (
                <>
                  <span className="badge">
                    WYCENA
                  </span>
                  <h2>
                    Przygotowujemy cenę
                  </h2>
                  <p className="muted">
                    To zapytanie nie jest
                    jeszcze wiążącym
                    zamówieniem. Wyślemy
                    wycenę e-mailem.
                  </p>
                </>
              )}

              {b.quote_status ===
                "priced" &&
                !b.quote_expires_at && (
                  <>
                    <span className="badge">
                      WYCENA
                    </span>
                    <h2>
                      Wycena wymaga
                      ponownego wysłania
                    </h2>
                    <p className="muted">
                      Ta wycena powstała
                      przed uruchomieniem
                      akceptacji online.
                      Skontaktuj się z MATT
                      TRANSPORT, aby otrzymać
                      aktualny link.
                    </p>
                    <a
                      className="btn secondary"
                      href="tel:+48691242691"
                    >
                      📞 +48 691 242 691
                    </a>
                  </>
                )}

              {b.quote_status ===
                "priced" &&
                b.quote_expires_at &&
                expired && (
                  <>
                    <span className="badge">
                      WYCENA WYGASŁA
                    </span>
                    <h2>
                      Termin ważności
                      wyceny minął
                    </h2>
                    <p>
                      Ostatnia cena:{" "}
                      <strong>
                        {Number(
                          b.total_price ||
                            0
                        ).toFixed(2)}{" "}
                        zł
                      </strong>
                    </p>
                    <p className="muted">
                      Poproś o ponowną
                      kalkulację przed
                      zamówieniem transportu.
                    </p>
                    <a
                      className="btn secondary"
                      href="tel:+48691242691"
                    >
                      📞 ZADZWOŃ DO MATT
                    </a>
                  </>
                )}

              {b.quote_status ===
                "accepted" && (
                  <>
                    <span className="badge">
                      ✓ WYCENA
                      ZAAKCEPTOWANA
                    </span>
                    <h2>
                      Zamówienie
                      potwierdzone
                    </h2>
                    <p>
                      Cena:{" "}
                      <strong>
                        {Number(
                          b.total_price ||
                            0
                        ).toFixed(2)}{" "}
                        zł
                      </strong>
                    </p>
                    <p>
                      Płatność:{" "}
                      <strong>
                        {paymentLabel(b)}
                      </strong>
                    </p>
                  </>
                )}

              {b.quote_status ===
                "rejected" && (
                  <>
                    <span className="badge">
                      WYCENA ODRZUCONA
                    </span>
                    <h2>
                      Zrezygnowano z
                      transportu
                    </h2>
                    <p className="muted">
                      Zlecenie nie będzie
                      realizowane. Jeśli
                      zmienisz zdanie,
                      skontaktuj się z nami.
                    </p>
                  </>
                )}
            </div>
          )}

          {![
            "completed",
            "cancelled"
          ].includes(b.status) &&
            (!general ||
              b.quote_status ===
                "accepted") && (
              <CustomerPushControls
                token={token}
              />
            )}

          {general &&
            b.quote_status ===
              "accepted" && (
              <div className="client-edit-warning">
                Wycena została
                zaakceptowana. Zmiany trasy
                lub terminu ustal z MATT
                TRANSPORT telefonicznie.
              </div>
            )}

          {editable && (
            <div className="client-edit-warning">
              {paidBooking
                ? "Rezerwacja jest już opłacona. Możesz ją edytować, ale zmiana adresu, daty, godziny lub ceny wymaga ponownego sprawdzenia przez MATT TRANSPORT. Jeśli zmieni się kwota, płatność zostanie oznaczona jako DO WERYFIKACJI — nie płać ponownie."
                : "Zmiana adresu, daty lub godziny powoduje ponowne sprawdzenie rezerwacji przez MATT TRANSPORT."}
            </div>
          )}

          {message && (
            <div
              className={
                message.startsWith(
                  "✓"
                ) ||
                message.startsWith(
                  "Zmiany"
                ) ||
                message.startsWith(
                  "Rezygnacja została"
                )
                  ? "client-success-message"
                  : "booking-error"
              }
            >
              {message}
            </div>
          )}

          {editing && (
            <button
              className="btn client-save-button"
              style={{ width: "100%", marginTop: 16 }}
              disabled={saving || cancelling}
              onClick={save}
            >
              {saving ? "ZAPISYWANIE..." : "ZAPISZ ZMIANY"}
            </button>
          )}

          {cancellable &&
            !showCancelConfirm && (
              <button
                type="button"
                className="btn secondary"
                style={{
                  width: "100%",
                  marginTop: 14,
                  borderColor: "#8b343b",
                  color: "#ffb9bf"
                }}
                disabled={
                  saving || cancelling
                }
                onClick={() =>
                  setShowCancelConfirm(
                    true
                  )
                }
              >
                ANULUJ REZERWACJĘ
              </button>
            )}

          {cancellable &&
            showCancelConfirm && (
              <div
                style={{
                  marginTop: 14,
                  padding: 16,
                  border:
                    "1px solid #8b343b",
                  borderRadius: 12,
                  background: "#2b171a"
                }}
              >
                <strong
                  style={{
                    color: "#ffb9bf"
                  }}
                >
                  Czy na pewno chcesz
                  całkowicie anulować tę
                  rezerwację?
                </strong>
                <p
                  className="muted"
                  style={{
                    marginTop: 8
                  }}
                >
                  Kurs zostanie oznaczony
                  jako anulowany i usunięty
                  z planu realizacji.
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "1fr 1fr",
                    gap: 10,
                    marginTop: 12
                  }}
                >
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={cancelling}
                    onClick={() =>
                      setShowCancelConfirm(
                        false
                      )
                    }
                  >
                    NIE, ZOSTAW
                  </button>
                  <button
                    type="button"
                    className="btn"
                    style={{
                      background:
                        "#8b343b",
                      borderColor:
                        "#a8434c"
                    }}
                    disabled={cancelling}
                    onClick={
                      cancelBooking
                    }
                  >
                    {cancelling
                      ? "ANULOWANIE..."
                      : "TAK, ANULUJ"}
                  </button>
                </div>
              </div>
            )}
        </section>

        <aside className="card client-booking-summary">
          <h2>Podsumowanie</h2>

          <div>
            <span>
              {general
                ? "Trasa"
                : "Lotnisko"}
            </span>
            <strong>
              {general
                ? `${b.pickup_address} → ${b.destination_address || b.airport_label}`
                : b.airport_label}
            </strong>
          </div>

          {general ? (
            <>
              <div>
                <span>Wycena</span>
                <strong>
                  {b.quote_status ===
                  "pending"
                    ? "W PRZYGOTOWANIU"
                    : b.quote_status ===
                      "rejected"
                    ? "ODRZUCONA"
                    : `${Number(
                        b.total_price || 0
                      ).toFixed(2)} zł`}
                </strong>
              </div>
              <div>
                <span>Decyzja</span>
                <strong>
                  {b.quote_status ===
                  "accepted"
                    ? "✓ ZAAKCEPTOWANA"
                    : b.quote_status ===
                      "rejected"
                    ? "✕ REZYGNACJA"
                    : b.quote_status ===
                      "priced"
                    ? expired
                      ? "WYGASŁA"
                      : "OCZEKUJE"
                    : "CZEKA NA WYCENĘ"}
                </strong>
              </div>
              {[
                "priced",
                "accepted"
              ].includes(
                b.quote_status
              ) && (
                <div>
                  <span>Płatność</span>
                  <strong>
                    {paymentLabel(b)}
                  </strong>
                </div>
              )}
            </>
          ) : b.company_id &&
            b2bMoney ? (
            <>
              <div>
                <span>Netto</span>
                <strong>
                  {b2bMoney.net.toFixed(
                    2
                  )}{" "}
                  zł
                </strong>
              </div>
              <div>
                <span>
                  VAT{" "}
                  {b2bMoney.vatRate.toFixed(
                    0
                  )}
                  %
                </span>
                <strong>
                  {b2bMoney.vat.toFixed(
                    2
                  )}{" "}
                  zł
                </strong>
              </div>
              <div>
                <span>Brutto</span>
                <strong>
                  {b2bMoney.gross.toFixed(
                    2
                  )}{" "}
                  zł
                </strong>
              </div>
            </>
          ) : (
            <div>
              <span>Kwota</span>
              <strong>
                {Number(
                  b.total_price
                ).toFixed(2)}{" "}
                zł
              </strong>
            </div>
          )}

          <div>
            <span>Status</span>
            <strong>
              {general
                ? quoteHeroStatus(b)
                : STATUS[b.status] ||
                  b.status}
            </strong>
          </div>

          {!general && (
            <div>
              <span>Płatność</span>
              <strong>
                {b.company_id
                  ? b.payment_method ===
                    "employee_payment"
                    ? "Płatność online firmy"
                    : "Przelew firmowy"
                  : b.payment_method ===
                      "online" ||
                    b.online_payment_requested
                  ? "Płatność online po potwierdzeniu"
                  : b.payment_method ===
                    "bank_transfer"
                  ? "Przelew tradycyjny"
                  : "Gotówka u kierowcy"}
              </strong>
            </div>
          )}

          {(!general ||
            b.quote_status ===
              "accepted") && (
            <OnlinePaymentCard
              booking={b}
            />
          )}

          {vehicle && (
            <div>
              <span>Pojazd</span>
              <strong>
                {vehicle.name} ·{" "}
                {vehicle.registration}
              </strong>
            </div>
          )}

          {driver && (
            <div>
              <span>Kierowca</span>
              <strong>
                {driver.full_name}
              </strong>
            </div>
          )}

          {driver?.phone && (
            <a
              className="btn secondary"
              href={`tel:${driver.phone}`}
            >
              📞 ZADZWOŃ DO KIEROWCY
            </a>
          )}

          <a
            className="btn secondary"
            href="tel:+48691242691"
          >
            📞 MATT TRANSPORT
          </a>
        </aside>
      </div>
    </main>
  );
}
