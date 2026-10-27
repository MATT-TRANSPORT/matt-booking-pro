"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { saveAirportPlannerHandoff } from "@/lib/airportPlannerHandoff";

type Suggestion = { placeId?: string; text?: string };
type DriveTime = { airport: string; airportLabel: string; distanceKm: number; durationMinutes: number; liveTraffic: boolean };
type Plan = { pickupAt: Date; arriveAt: Date; flightAt: Date; drive: DriveTime; address: string; buffer: number; before: number };

const AIRPORTS = [
  { key: "pyrzowice", label: "Katowice-Pyrzowice (KTW)" },
  { key: "balice", label: "Kraków-Balice (KRK)" },
  { key: "ostrawa", label: "Ostrawa (OSR)" },
  { key: "wroclaw", label: "Wrocław (WRO)" },
  { key: "warszawa", label: "Warszawa-Chopin (WAW)" },
  { key: "prague", label: "Praga (PRG)" },
  { key: "vienna", label: "Wiedeń (VIE)" },
];

const dateTimeFormat = new Intl.DateTimeFormat("pl-PL", {
  weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
});

export default function AirportDeparturePlanner() {
  const listboxId = useId();
  const inputId = useId();
  const suggestionController = useRef<AbortController | null>(null);

  const [address, setAddress] = useState("");
  const [chosenAddress, setChosenAddress] = useState("");
  const [airport, setAirport] = useState("pyrzowice");
  const [flightAt, setFlightAt] = useState("");
  const [before, setBefore] = useState(150);
  const [buffer, setBuffer] = useState(30);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);

  useEffect(() => {
    setSuggestions([]);
    setActiveSuggestion(-1);
    suggestionController.current?.abort();
    if (address.trim().length < 3 || address === chosenAddress || address.trim().length > 170) {
      setLoadingPlaces(false);
      return;
    }
    const controller = new AbortController();
    suggestionController.current = controller;
    const timer = window.setTimeout(async () => {
      setLoadingPlaces(true);
      try {
        const response = await fetch(`/api/places?q=${encodeURIComponent(address.trim())}`, {
          signal: controller.signal, cache: "no-store",
        });
        const data: { suggestions?: Suggestion[] } = await response.json();
        if (!response.ok) throw new Error("Nie udało się pobrać propozycji adresów");
        if (!controller.signal.aborted) {
          setSuggestions((data.suggestions ?? []).filter((s) => Boolean(s.text)).slice(0, 6));
          setSuggestionOpen(true);
        }
      } catch {
        if (!controller.signal.aborted) setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setLoadingPlaces(false);
      }
    }, 380);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [address, chosenAddress]);

  function chooseSuggestion(item: Suggestion) {
    const value = String(item.text ?? "").trim();
    if (!value) return;
    setAddress(value);
    setChosenAddress(value);
    setSuggestions([]);
    setSuggestionOpen(false);
    setActiveSuggestion(-1);
    setError("");
    setPlan(null);
  }

  function handleAddressKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!suggestionOpen || suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestion((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestion((i) => (i < 1 ? suggestions.length - 1 : i - 1));
    } else if (event.key === "Enter" && activeSuggestion >= 0) {
      event.preventDefault();
      chooseSuggestion(suggestions[activeSuggestion]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setSuggestionOpen(false);
      setActiveSuggestion(-1);
    }
  }

  async function calculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPlan(null);

    if (address.trim().length < 8 || address.trim().length > 220) {
      setError("Podaj pełny adres odbioru: miejscowość, ulicę i numer budynku.");
      return;
    }
    if (!flightAt) {
      setError("Wybierz datę i godzinę wylotu.");
      return;
    }
    const flight = new Date(flightAt);
    if (Number.isNaN(flight.getTime())) {
      setError("Nieprawidłowa data wylotu.");
      return;
    }

    setBusy(true);
    setSuggestionOpen(false);
    try {
      const response = await fetch("/api/public/airport-drive-time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: address.trim(), airport }),
      });
      const data: DriveTime & { error?: string } = await response.json();
      if (!response.ok || !Number.isFinite(data.durationMinutes) || data.durationMinutes <= 0) {
        throw new Error(data.error || "Nie udało się wyznaczyć trasy. Sprawdź adres i spróbuj ponownie.");
      }
      const arriveAt = new Date(flight.getTime() - before * 60000);
      const pickupAt = new Date(arriveAt.getTime() - (data.durationMinutes + buffer) * 60000);
      setPlan({ pickupAt, arriveAt, flightAt: flight, drive: data, address: address.trim(), buffer, before });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się obliczyć trasy.");
    } finally {
      setBusy(false);
    }
  }

  const bookingLink = `/booking?service=airport&airport=${encodeURIComponent(airport)}&entry=airport_departure_planner`;
  function continueToBooking() {
    if (!plan) return;
    const pickup = plan.pickupAt;
    const date = [
      pickup.getFullYear(),
      String(pickup.getMonth() + 1).padStart(2, "0"),
      String(pickup.getDate()).padStart(2, "0"),
    ].join("-");
    const time = [
      String(pickup.getHours()).padStart(2, "0"),
      String(pickup.getMinutes()).padStart(2, "0"),
    ].join(":");
    saveAirportPlannerHandoff({ airport: plan.drive.airport, address: plan.address, travelDate: date, travelTime: time });
  }

  return (
    <main className="airport-planner-wrap">
      <div className="airport-planner">
        <a className="airport-planner-back" href="/booking">← Powrót do rezerwacji</a>
        <span className="airport-planner-tag">MATT TRANSPORT · PLANER PODRÓŻY</span>
        <h1>O której wyjechać na lotnisko?</h1>
        <p className="airport-planner-lead">Wpisz adres odbioru, wybierz lotnisko i godzinę lotu. Sprawdzimy orientacyjny czas dojazdu i podpowiemy, kiedy najlepiej wyruszyć.</p>

        <form className="airport-planner-form" onSubmit={calculate}>
          <div className="airport-planner-field airport-planner-address">
            <label htmlFor={inputId}>📍 Adres odbioru</label>
            <input
              id={inputId} type="text" autoComplete="off" spellCheck={false} required
              placeholder="Wpisz miejscowość, ulicę i numer"
              value={address} maxLength={220}
              role="combobox" aria-expanded={suggestionOpen && suggestions.length > 0}
              aria-controls={listboxId} aria-autocomplete="list"
              aria-activedescendant={activeSuggestion >= 0 ? `${listboxId}-option-${activeSuggestion}` : undefined}
              onChange={(e) => {
                setAddress(e.target.value);
                setChosenAddress("");
                setSuggestionOpen(true);
                setPlan(null);
              }}
              onFocus={() => setSuggestionOpen(true)}
              onBlur={() => window.setTimeout(() => setSuggestionOpen(false), 150)}
              onKeyDown={handleAddressKeyDown}
            />
            {suggestionOpen && suggestions.length > 0 && (
              <ul id={listboxId} role="listbox" className="airport-planner-suggestions" aria-label="Podpowiadane adresy">
                {suggestions.map((s, i) => (
                  <li key={s.placeId ?? `suggestion-${i}`} id={`${listboxId}-option-${i}`} role="option"
                    aria-selected={activeSuggestion === i}>
                    <button type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => chooseSuggestion(s)}
                      className={activeSuggestion === i ? "selected" : ""}>
                      <span aria-hidden="true">📍</span>{s.text}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <small className="airport-planner-hint" aria-live="polite">
              {loadingPlaces ? "Szukam adresów…" : chosenAddress ? "✓ Adres wybrany z podpowiedzi" : "Po wpisaniu 3 znaków wybierz adres z listy. Możesz też wpisać go ręcznie."}
            </small>
          </div>

          <div className="airport-planner-field">
            <label htmlFor="airport-planner-airport">✈️ Lotnisko</label>
            <select id="airport-planner-airport" value={airport} onChange={(e) => { setAirport(e.target.value); setPlan(null); }}>
              {AIRPORTS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
            </select>
          </div>

          <div className="airport-planner-field">
            <label htmlFor="airport-planner-flight">🕒 Data i godzina wylotu</label>
            <input id="airport-planner-flight" type="datetime-local" required value={flightAt}
              onChange={(e) => { setFlightAt(e.target.value); setPlan(null); }} />
          </div>

          <div className="airport-planner-field">
            <label htmlFor="airport-planner-before">Kiedy chcesz dotrzeć na lotnisko?</label>
            <select id="airport-planner-before" value={before} onChange={(e) => { setBefore(Number(e.target.value)); setPlan(null); }}>
              <option value={120}>2 godziny przed lotem</option>
              <option value={150}>2 godziny 30 minut przed lotem</option>
              <option value={180}>3 godziny przed lotem</option>
              <option value={210}>3 godziny 30 minut przed lotem</option>
            </select>
          </div>

          <div className="airport-planner-field">
            <label htmlFor="airport-planner-buffer">Dodatkowy zapas na drogę</label>
            <select id="airport-planner-buffer" value={buffer} onChange={(e) => { setBuffer(Number(e.target.value)); setPlan(null); }}>
              <option value={15}>15 minut</option><option value={30}>30 minut</option>
              <option value={45}>45 minut</option><option value={60}>60 minut</option>
              <option value={90}>90 minut</option>
            </select>
          </div>

          <button className="airport-planner-submit" type="submit" disabled={busy}>
            {busy ? "Wyznaczam trasę…" : "⏱️ Oblicz godzinę wyjazdu"}
          </button>
          {error && <div className="airport-planner-error" role="alert">{error}</div>}
        </form>

        {plan && (
          <section className="airport-planner-result" aria-live="polite">
            <span className="airport-planner-result-kicker">SUGEROWANY WYJAZD</span>
            <h2>{dateTimeFormat.format(plan.pickupAt)}</h2>
            <div className="airport-planner-stats">
              <div><strong>{plan.drive.durationMinutes} min</strong><span>orientacyjny dojazd</span></div>
              <div><strong>{plan.drive.distanceKm} km</strong><span>długość trasy</span></div>
              <div><strong>{plan.buffer} min</strong><span>dodatkowy zapas</span></div>
            </div>
            <p><strong>Przyjazd na lotnisko:</strong> {dateTimeFormat.format(plan.arriveAt)}</p>
            <p className="airport-planner-route">{plan.address} → {plan.drive.airportLabel}</p>
            <a className="airport-planner-reserve" href={bookingLink} onClick={continueToBooking}>Sprawdź cenę i zarezerwuj transfer ↗</a>
          </section>
        )}

        <p className="airport-planner-disclaimer">Czas przejazdu pochodzi z Google Routes i nie obejmuje prognozy korków na żywo. Godzinę wylotu wpisz według lokalnego czasu lotniska; poza tą strefą czasową przeliczenie może wymagać korekty. Uwzględnij wymagania linii lotniczej dotyczące odprawy, nadania bagażu i wejścia na pokład. W przypadku wyjazdu w noc zmiany czasu zimowego lub letniego sprawdź godzinę z przewoźnikiem.</p>
      </div>
    </main>
  );
}
