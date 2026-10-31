"use client";
import { customerFetch } from "@/lib/customerFetch";
import { customerText } from "@/lib/customerCopy";
import { useCustomerLocale } from "@/lib/useCustomerLocale";

import { useEffect, useState } from "react";
import { useAirportPricing } from "@/lib/useAirportPricing";

function finite(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function fixed(value: unknown, digits = 2) {
  return finite(value, 0).toFixed(digits);
}

function normalizeQuote(raw: any) {
  const multiplier = Math.max(1, finite(raw?.multiplier, 1));
  const baseOneWayNet = money(finite(raw?.baseOneWayNet, 0));
  const basePriceNet = money(finite(raw?.basePriceNet, baseOneWayNet * multiplier));
  const extraPriceNet = money(finite(raw?.extraPriceNet, 0));
  const additionalStopFeeNet = money(finite(raw?.additionalStopFeeNet, 0));
  const additionalStopExtraPriceNet = money(finite(raw?.additionalStopExtraPriceNet, 0));
  const net = money(basePriceNet + extraPriceNet + additionalStopFeeNet + additionalStopExtraPriceNet);
  const vatRate = finite(raw?.vatRate, 8);
  const vat = money(net * (vatRate / 100));
  const gross = money(net + vat);
  return { ...raw, originAddress: String(raw?.originAddress || ""), distanceKm: finite(raw?.distanceKm,0), freeKm: finite(raw?.freeKm,0), billableKm: finite(raw?.billableKm,0), extraKmRateNet: finite(raw?.extraKmRateNet,0), baseOneWayNet, basePriceNet, extraPriceNet, additionalStopFeeNet, additionalStopExtraPriceNet, additionalStopExtraKm: finite(raw?.additionalStopExtraKm,0), multiplier, net, vatRate, vat, gross };
}

export default function CompanyBookingForm({
  employees,
  companyName,
  commercialTerms,
  addresses = []
}: {
  employees: any[];
  companyName?: string;
  commercialTerms?: any | null;
  addresses?: any[];
}) {
 const fetchCustomer=(input:RequestInfo|URL,init?:RequestInit)=>customerFetch(locale,input,init);
  const locale = useCustomerLocale();
  const t = (key: string) => customerText(key, locale);
  const { airports } = useAirportPricing();
  const employeeRows = Array.isArray(employees) ? employees : [];
  const [passengerMode, setPassengerMode] = useState<"existing" | "new">(
    employeeRows.length ? "existing" : "new"
  );
  const [employeeId, setEmployeeId] = useState("");
  const [newEmployee, setNewEmployee] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    defaultAddress: "",
    department: ""
  });
  const [serviceType, setServiceType] =
    useState<"to_airport" | "from_airport" | "roundtrip">("to_airport");
  const [address, setAddress] = useState("");
  const [airport, setAirport] = useState<string>("balice");
  const [vehicle, setVehicle] = useState<"car" | "bus">("car");
  const [passengers, setPassengers] = useState(1);
  const [travelDate, setTravelDate] = useState("");
  const [travelTime, setTravelTime] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [returnTime, setReturnTime] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [returnFlightNumber, setReturnFlightNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<"company_transfer" | "employee_payment">("company_transfer");
  const [paymentInitialized, setPaymentInitialized] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [routeStopsOut, setRouteStopsOut] = useState<string[]>([]);
  const [routeStopsBack, setRouteStopsBack] = useState<string[]>([]);
  const multiStopActive = routeStopsOut.length > 0 || routeStopsBack.length > 0;
  const [additionalStopEnabled, setAdditionalStopEnabled] = useState(false);
  const [additionalStopAddress, setAdditionalStopAddress] = useState("");
  const [additionalStopPrimary, setAdditionalStopPrimary] = useState(true);
  const [additionalStopReturn, setAdditionalStopReturn] = useState(false);
  const [additionalStopSuggestions, setAdditionalStopSuggestions] = useState<any[]>([]);
  const [quote, setQuote] = useState<any>(null);
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<any>(null);

  const employee = employeeRows.find((x) => String(x?.id) === String(employeeId));

  useEffect(() => {
    if (passengerMode === "existing" && employee?.default_address) {
      setAddress(String(employee.default_address || ""));
    }
  }, [employeeId, passengerMode]);

  useEffect(() => {
    if (passengerMode === "new" && newEmployee.defaultAddress) {
      setAddress(String(newEmployee.defaultAddress || ""));
    }
  }, [newEmployee.defaultAddress, passengerMode]);

  useEffect(() => {
    if (passengers > 3) setVehicle("bus");
  }, [passengers]);

  useEffect(() => {
    if (address.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await fetchCustomer(`/api/places?q=${encodeURIComponent(address)}`);
        const data = await response.json();
        setSuggestions(data.suggestions ?? []);
      } catch {
        setSuggestions([]);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [address]);

  useEffect(() => {
    if (serviceType !== "roundtrip") setAdditionalStopReturn(false);
  }, [serviceType]);
  useEffect(() => {
    if (airports[airport]) return;
    const fallback = airports.balice ? "balice" : Object.keys(airports)[0];
    if (fallback) setAirport(fallback);
  }, [airports, airport]);


  useEffect(() => {
    if (!additionalStopEnabled || additionalStopAddress.trim().length < 3) {
      setAdditionalStopSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const response = await fetchCustomer(`/api/places?q=${encodeURIComponent(additionalStopAddress)}`);
        const data = await response.json();
        setAdditionalStopSuggestions(data.suggestions ?? []);
      } catch {
        setAdditionalStopSuggestions([]);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [additionalStopEnabled, additionalStopAddress]);

  useEffect(() => {
    if (address.trim().length < 5) {
      setQuote(null);
      setQuoteError("");
      return;
    }

    const timer = setTimeout(() => {
      quoteFor(address);
    }, 650);

    return () => clearTimeout(timer);
  }, [address, airport, vehicle, serviceType, additionalStopEnabled, additionalStopAddress, additionalStopPrimary, additionalStopReturn, routeStopsOut, routeStopsBack]);

  async function quoteFor(value: string) {
    if (!value) return;
    setQuoteBusy(true);
    setQuoteError("");

    try {
      const response = await fetchCustomer("/api/company/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale,
          address: value,
          airport,
          vehicleType: vehicle,
          serviceType,
          ...(multiStopActive ? { routeStops: { outbound: routeStopsOut, inbound: serviceType === "roundtrip" ? routeStopsBack : [] } } : {}),
          additionalStopAddress: multiStopActive ? null : additionalStopEnabled ? additionalStopAddress : null,
          additionalStopPrimary: additionalStopEnabled && additionalStopPrimary,
          additionalStopReturn: additionalStopEnabled && serviceType === "roundtrip" && additionalStopReturn
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setQuote(null);
        setQuoteError(data.error ?? t("Nie udało się przygotować wyceny."));
      } else {
        setQuote(normalizeQuote(data));
        if (!paymentInitialized) {
          setPaymentMethod(data.defaultPaymentMethod || "company_transfer");
          setPaymentInitialized(true);
        }
      }
    } catch {
      setQuote(null);
      setQuoteError(t("Nie udało się połączyć z kalkulatorem B2B."));
    }

    setQuoteBusy(false);
  }

  async function submit() {
    if (saving) return;

    if (passengerMode === "existing" && !employeeId) {
      setMessage(t("Wybierz pracownika."));
      return;
    }

    if (
      passengerMode === "new" &&
      (!newEmployee.firstName || !newEmployee.lastName)
    ) {
      setMessage(t("Podaj imię i nazwisko nowego pracownika."));
      return;
    }

    if (!address || !travelDate || !travelTime) {
      setMessage(t("Uzupełnij adres oraz termin."));
      return;
    }

    if (!multiStopActive && additionalStopEnabled && (!additionalStopAddress.trim() || (!additionalStopPrimary && !(serviceType === "roundtrip" && additionalStopReturn)))) {
      setMessage(t("Uzupełnij dodatkowy adres i wybierz kierunek przystanku."));
      return;
    }

    if (multiStopActive && [...routeStopsOut,...routeStopsBack].some(x => x.trim().length < 5)) {
      setMessage(t("Uzupełnij wszystkie adresy przystanków."));
      return;
    }
    if (!quote) {
      setMessage(t("Poczekaj na poprawną wycenę B2B."));
      return;
    }

    setSaving(true);
    setMessage(t("Zapisywanie rezerwacji i ponowne przeliczanie ceny na serwerze..."));

    const response = await fetchCustomer("/api/company/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale,
        employeeId: passengerMode === "existing" ? employeeId : null,
        newEmployee: passengerMode === "new" ? newEmployee : null,
        serviceType,
        address,
        airport,
        vehicleType: vehicle,
        passengers,
        travelDate,
        travelTime,
        returnDate,
        returnTime,
        flightNumber,
        returnFlightNumber,
        ...(multiStopActive ? { routeStops: { outbound: routeStopsOut, inbound: serviceType === "roundtrip" ? routeStopsBack : [] } } : {}),
        additionalStopAddress: multiStopActive ? null : additionalStopEnabled ? additionalStopAddress : null,
        additionalStopPrimary: additionalStopEnabled && additionalStopPrimary,
        additionalStopReturn: additionalStopEnabled && serviceType === "roundtrip" && additionalStopReturn,
        notes,
        paymentMethod
      })
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? t("Nie udało się zapisać rezerwacji."));
      setSaving(false);
      return;
    }

    setSuccess(data);
    setMessage("");
    setSaving(false);
  }

  if (success) {
    const successQuote = success.quote ? normalizeQuote(success.quote) : null;
    const net = money(finite(success.price_net, successQuote?.net ?? 0));
    const vatRate = finite(success.vat_rate, successQuote?.vatRate ?? 8);
    const vat = money(finite(success.vat_price, successQuote?.vat ?? net * (vatRate / 100)));
    const gross = money(net + vat);

    return (
      <div className="booking-success-card">
        <div className="success-check">✓</div>
        <span className="badge">MATT BOOKING PRO · B2B PRO</span>
        <h1>{t("Transport zamówiony")}</h1>
        <p className="success-lead">{t("Rezerwacja firmowa została przyjęta.")}</p>

        <div className="success-number">
          <span>{t("Numer rezerwacji")}</span>
          <strong>{success.booking_number}</strong>
        </div>

        <div className="success-details">
          <div><span>{t("Pasażer")}</span><strong>{success.customer_name}</strong></div>
          <div><span>{t("Netto")}</span><strong>{net.toFixed(2)} zł</strong></div>
          <div><span>{t("VAT")} 8%</span><strong>{vat.toFixed(2)} zł</strong></div>
          <div><span>{t("Brutto")}</span><strong>{gross.toFixed(2)} zł</strong></div>
        </div>

        <p className="muted">
          {t("Wszystkie ceny B2B są cenami netto. Do ceny doliczany jest VAT 8%.")}</p>

        <div className="success-actions">
          <a className="btn" href="/firma/nowa-rezerwacja">{t("NOWA REZERWACJA")}</a>
          <a className="btn secondary" href="/firma/rezerwacje">{t("MOJE REZERWACJE")}</a>
        </div>
      </div>
    );
  }

  return (
    <div className="layout">
      <div className="card">
        <span className="badge">B2B PRO</span>
        <h1>{t("Nowy transport")}</h1>

        <div className="b2b-booking-terms-banner">
          <div>
            <small>{t("WARUNKI")}{companyName ? companyName.toUpperCase() : t("KONTRAHENTA")}</small>
            <strong>
              {commercialTerms
                ? `${Number(commercialTerms.free_km ?? 0).toFixed(1)} km bez dopłaty · ${Number(commercialTerms.extra_km_rate_net ?? 0).toFixed(2)} zł netto/km ponad limit`
                : t("Warunki handlowe zostaną pobrane przy wycenie")}
            </strong>
            <span>
              {commercialTerms?.use_custom_pricing ? t("Cennik indywidualny") : t("Cennik standardowy MATT / indywidualny fallback")}
              {commercialTerms?.effective_from ? ` · ważny od ${commercialTerms.effective_from}` : ""}
            </span>
          </div>
          <a href="/firma/cennik">{t("ZOBACZ CENNIK →")}</a>
        </div>

        <h3>{t("Pasażer")}</h3>
        <div className="passenger-mode">
          <button
            type="button"
            className={passengerMode === "existing" ? "active" : ""}
            onClick={() => setPassengerMode("existing")}
            disabled={!employeeRows.length}
          >
            {t("Z listy pracowników")}</button>
          <button
            type="button"
            className={passengerMode === "new" ? "active" : ""}
            onClick={() => setPassengerMode("new")}
          >
            {t("+ Nowy pracownik")}</button>
        </div>

        {passengerMode === "existing" ? (
          <label>
            {t("Pracownik")}<select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">{t("— Wybierz pracownika —")}</option>
              {employeeRows.filter((x) => x?.active !== false).map((x) => (
                <option key={x.id} value={x.id}>{x.first_name} {x.last_name}</option>
              ))}
            </select>
          </label>
        ) : (
          <div className="grid new-employee-inline">
            <label>{t("Imię")}<input value={newEmployee.firstName} onChange={(e) => setNewEmployee({ ...newEmployee, firstName: e.target.value })} /></label>
            <label>{t("Nazwisko")}<input value={newEmployee.lastName} onChange={(e) => setNewEmployee({ ...newEmployee, lastName: e.target.value })} /></label>
            <label>{t("Telefon")}<input value={newEmployee.phone} onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })} /></label>
            <label>{t("E-mail")}<input type="email" value={newEmployee.email} onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })} /></label>
            <label>{t("Domyślny adres")}<input value={newEmployee.defaultAddress} onChange={(e) => setNewEmployee({ ...newEmployee, defaultAddress: e.target.value })} /></label>
            <label>{t("Dział")}<input value={newEmployee.department} onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })} /></label>
          </div>
        )}

        <h3>{t("Rodzaj przejazdu")}</h3>
        <div className="choice-grid">
          <button type="button" className={`choice ${serviceType === "to_airport" ? "active" : ""}`} onClick={() => setServiceType("to_airport")}><strong>{t("🛫 Na lotnisko")}</strong></button>
          <button type="button" className={`choice ${serviceType === "from_airport" ? "active" : ""}`} onClick={() => setServiceType("from_airport")}><strong>{t("🛬 Z lotniska")}</strong></button>
          <button type="button" className={`choice ${serviceType === "roundtrip" ? "active" : ""}`} onClick={() => setServiceType("roundtrip")}><strong>{t("🔁 W obie strony")}</strong></button>
        </div>

        <h3>{serviceType === "from_airport" ? t("Skąd odbieramy pasażera?") : t("Dokąd jedziemy?")}</h3>
        {addresses.length > 0 && (
          <label className="company-saved-address-select">
            {t("Zapisane adresy firmy")}<select
              value=""
              onChange={(e) => {
                const selected = addresses.find((item: any) => String(item.id) === e.target.value);
                if (selected?.address) {
                  const value = String(selected.address);
                  setAddress(value);
                  setSuggestions([]);
                  setTimeout(() => quoteFor(value), 0);
                }
              }}
            >
              <option value="">{t("— Wybierz zapisane miejsce —")}</option>
              {addresses.map((item: any) => (
                <option key={item.id} value={item.id}>{item.label} · {item.address}</option>
              ))}
            </select>
          </label>
        )}
        <div className="grid">
          <label className={serviceType === "from_airport" ? "route-address second" : "route-address first"}>
            {serviceType === "from_airport" ? t("Adres docelowy") : t("Adres odbioru")}
            <input value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="off" />
            {suggestions.length > 0 && (
              <div className="address-suggestions">
                {suggestions.slice(0, 5).map((s: any, i: number) => (
                  <button key={s.placeId ?? i} type="button" onClick={() => {
                    const value = String(s?.text ?? "");
                    setAddress(value);
                    setSuggestions([]);
                    setTimeout(() => quoteFor(value), 0);
                  }}>{s.text}</button>
                ))}
              </div>
            )}
          </label>

          <label className={serviceType === "from_airport" ? "route-airport first" : "route-airport second"}>
            {serviceType === "from_airport" ? t("Z jakiego lotniska?") : t("Lotnisko")}
            <select value={airport} onChange={(e) => setAirport(e.target.value)}>
              {Object.entries(airports).map(([key, value]) => (
                <option key={key} value={key}>{value.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="additional-stop-box">
          <strong>{t("Wiele adresów / przystanków")}</strong>
          <p className="muted">{t("Dodaj adresy w kolejności przejazdu. Maksymalnie 10 dodatkowych przystanków łącznie.")}</p>
          {([
            { name: t("Wyjazd"), values: routeStopsOut, set: setRouteStopsOut },
            ...(serviceType === "roundtrip" ? [{ name: t("Powrót"), values: routeStopsBack, set: setRouteStopsBack }] : [])
          ]).map((section) => (
            <div key={section.name}>
              <h4>{section.name}</h4>
              {section.values.map((value, index) => (
                <div key={index} className="row" style={{gap:8,alignItems:"center"}}>
                  <input aria-label={section.name + " " + (index + 1)} value={value}
                    onChange={(e) => section.set(section.values.map((item,i) => i === index ? e.target.value : item))}
                    placeholder={t("Wpisz adres przystanku")}/>
                  <button type="button" className="btn secondary" disabled={index === 0}
                    onClick={() => section.set(section.values.map((item,i) => i === index-1 ? section.values[index] : i === index ? section.values[index-1] : item))}>↑</button>
                  <button type="button" className="btn secondary" disabled={index === section.values.length-1}
                    onClick={() => section.set(section.values.map((item,i) => i === index+1 ? section.values[index] : i === index ? section.values[index+1] : item))}>↓</button>
                  <button type="button" className="btn secondary" onClick={() => section.set(section.values.filter((_,i) => i !== index))}>×</button>
                </div>
              ))}
              <button type="button" className="btn secondary" disabled={routeStopsOut.length + routeStopsBack.length >= 10}
                onClick={() => {setAdditionalStopEnabled(false); section.set([...section.values,""]);}}>
                {t("+ DODAJ ADRES")}
              </button>
            </div>
          ))}
          {multiStopActive && <small>{t("Cena zostanie przeliczona na serwerze dla pełnej trasy.")}</small>}
        </div>

        {multiStopActive ? null : !additionalStopEnabled ? (
          <button type="button" className="btn secondary additional-stop-toggle" onClick={() => setAdditionalStopEnabled(true)}>
            {t("+ DODAJ DODATKOWY ADRES / PRZYSTANEK")}</button>
        ) : (
          <div className="additional-stop-box">
            <div className="additional-stop-head">
              <div><strong>{t("Dodatkowy adres / przystanek")}</strong><small>{t("+20,00 zł netto za każdy użyty kierunek. Kilometry doliczamy tylko za faktyczny objazd poza normalną trasę.")}</small></div>
              <button type="button" className="btn secondary" onClick={() => { setAdditionalStopEnabled(false); setAdditionalStopAddress(""); setAdditionalStopPrimary(true); setAdditionalStopReturn(false); setAdditionalStopSuggestions([]); }}>{t("USUŃ")}</button>
            </div>
            <label>{t("Adres dodatkowego przystanku")}<input value={additionalStopAddress} onChange={(e) => setAdditionalStopAddress(e.target.value)} autoComplete="off" placeholder={t("Wpisz drugi adres")} />
              {additionalStopSuggestions.length > 0 && (
                <div className="address-suggestions">
                  {additionalStopSuggestions.slice(0, 5).map((item: any, i: number) => (
                    <button key={item.placeId ?? i} type="button" onClick={() => { setAdditionalStopAddress(String(item?.text ?? "")); setAdditionalStopSuggestions([]); }}>{item.text}</button>
                  ))}
                </div>
              )}
            </label>
            {serviceType === "roundtrip" ? (
              <div className="additional-stop-directions">
                <label><input type="checkbox" checked={additionalStopPrimary} onChange={(e) => setAdditionalStopPrimary(e.target.checked)} /> {t("Wyjazd na lotnisko (+20 zł netto)")}</label>
                <label><input type="checkbox" checked={additionalStopReturn} onChange={(e) => setAdditionalStopReturn(e.target.checked)} /> {t("Powrót z lotniska (+20 zł netto)")}</label>
              </div>
            ) : (
              <p className="muted">{t("Przystanek dotyczy tego przejazdu · +20,00 zł netto.")}</p>
            )}
            {quote?.additionalStopAddress && (
              <div className="route-status ok">
                {Number(quote.additionalStopExtraKm || 0) > 0
                  ? `Objazd poza normalną trasę: ${fixed(quote.additionalStopExtraKm, 1)} km · dopłata ${fixed(quote.additionalStopExtraPriceNet, 2)} zł netto`
                  : t("✓ Przystanek jest na trasie — bez dopłaty kilometrowej.")}
              </div>
            )}
          </div>
        )}

        <div className={`route-status ${quote ? "ok" : ""}`}>
          {quoteBusy
            ? t("Obliczanie odległości od siedziby kontrahenta i wyceny...")
            : quote
            ? multiStopActive ? `✓ Objazd: ${fixed(quote.billableKm, 1)} km płatne` : `✓ ${fixed(quote.distanceKm, 1)} km od siedziby kontrahenta · ${fixed(quote.billableKm, 1)} km płatne`
            : quoteError || t("Wybierz dokładny adres, aby pobrać indywidualną wycenę.")}
        </div>

        <h3>{t("Termin")}</h3>
        <p className="muted flight-time-hint">{t("Dla wyjazdu na lotnisko podaj godzinę wyjazdu spod wskazanego adresu. Przy odbiorze z lotniska podaj godzinę przylotu z rozkładu lotu.")}</p>
        <div className="grid">
          <label>{t("Data")}<input type="date" value={travelDate} onChange={(e) => setTravelDate(e.target.value)} /></label>
          <label>{serviceType === "from_airport" ? t("Godzina przylotu") : t("Godzina wyjazdu na lotnisko")}<input type="time" value={travelTime} onChange={(e) => setTravelTime(e.target.value)} /></label>
          <label>{t("Numer lotu")}<input value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} /></label>
          <label>{t("Pasażerowie")}<select value={passengers} onChange={(e) => setPassengers(Number(e.target.value))}>{[1,2,3,4,5,6,7,8].map((x) => <option key={x}>{x}</option>)}</select></label>
          {serviceType === "roundtrip" && (
            <>
              <label>{t("Data powrotu")}<input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} /></label>
              <label>{t("Godzina przylotu powrotnego")}<input type="time" value={returnTime} onChange={(e) => setReturnTime(e.target.value)} /></label>
              <label>{t("Lot powrotny")}<input value={returnFlightNumber} onChange={(e) => setReturnFlightNumber(e.target.value)} /></label>
            </>
          )}
        </div>

        <h3>{t("Pojazd")}</h3>
        <div className="choice-grid vehicle-grid">
          <button type="button" className={`choice ${vehicle === "car" ? "active" : ""}`} disabled={passengers > 3} onClick={() => setVehicle("car")}><strong>{t("Samochód osobowy")}</strong><small>{t("Do 3 pasażerów")}</small></button>
          <button type="button" className={`choice ${vehicle === "bus" ? "active" : ""}`} onClick={() => setVehicle("bus")}><strong>{t("Bus do 8 osób")}</strong><small>{t("Grupy / większy bagaż")}</small></button>
        </div>

        <h3>{t("Płatność")}</h3>
        <div className="choice-grid">
          <button type="button" className={`choice ${paymentMethod === "company_transfer" ? "active" : ""}`} onClick={() => { setPaymentMethod("company_transfer"); setPaymentInitialized(true); }}><strong>{t("🏢 Przelew firmowy")}</strong><small>{t("Rozliczenie zgodnie z warunkami firmy")}</small></button>
          <button type="button" className={`choice ${paymentMethod === "employee_payment" ? "active" : ""}`} onClick={() => { setPaymentMethod("employee_payment"); setPaymentInitialized(true); }}><strong>{t("💳 Płatność online firmy")}</strong><small>{t("Administrator firmy płaci kartą / Stripe kwotę BRUTTO")}</small></button>
        </div>

        <label style={{ marginTop: 18 }}>{t("Uwagi")}<textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
      </div>

      <aside className="card summary">
        <span className="badge">{t("TWOJE WARUNKI")}</span>
        <h3>{t("Podsumowanie B2B")}</h3>
        <div className="row"><span>{t("Pasażer")}</span><strong>{passengerMode === "existing" ? (employee ? `${employee.first_name} ${employee.last_name}` : "—") : `${newEmployee.firstName} ${newEmployee.lastName}`.trim() || "—"}</strong></div>

        {quote ? (
          <>
            <div className="row"><span>{t("Warunki ważne od")}</span><strong>{quote.effectiveFrom || "—"}</strong></div>
            <div className="row"><span>{t("Siedziba kontrahenta")}</span><strong style={{ textAlign: "right", maxWidth: "60%" }}>{quote.originAddress}</strong></div>
            <div className="row"><span>{t("Odległość od siedziby")}</span><strong>{fixed(quote.distanceKm, 1)} km</strong></div>
            <div className="row"><span>{t("Limit bez dopłaty")}</span><strong>{fixed(quote.freeKm, 1)} km</strong></div>
            <div className="row"><span>{t("Km płatne")}</span><strong>{fixed(quote.billableKm, 1)} km</strong></div>
            <div className="row"><span>{t("Stawka ponad limit")}</span><strong>{fixed(quote.extraKmRateNet, 2)} {t("zł netto/km")}</strong></div>
            <div className="row"><span>{t("Cena 1 strony")}</span><strong>{fixed(quote.baseOneWayNet, 2)} {t("zł netto")}</strong></div>
            {quote.multiplier > 1 && <div className="row"><span>{t("Mnożnik przejazdu")}</span><strong>× {quote.multiplier}</strong></div>}
            <div className="row"><span>{t("Cena bazowa")}</span><strong>{fixed(quote.basePriceNet, 2)} {t("zł netto")}</strong></div>
            <div className="row"><span>{t("Dopłata km")}</span><strong>{fixed(quote.extraPriceNet, 2)} {t("zł netto")}</strong></div>
            {quote.additionalStopFeeNet > 0 && <div className="row"><span>{t("Dodatkowe przystanki")}</span><strong>{fixed(quote.additionalStopFeeNet, 2)} {t("zł netto")}</strong></div>}
            {quote.additionalStopExtraKm > 0 && <div className="row"><span>{t("Objazd przystanku")}</span><strong>{fixed(quote.additionalStopExtraKm, 1)} km · {fixed(quote.additionalStopExtraPriceNet, 2)} {t("zł netto")}</strong></div>}
            <div className="row total"><span>{t("RAZEM NETTO")}</span><strong>{fixed(quote.net, 2)} zł</strong></div>
            <div className="row"><span>{t("VAT")} {fixed(quote.vatRate, 0)}%</span><strong>{fixed(quote.vat, 2)} zł</strong></div>
            <div className="row total"><span>{t("RAZEM BRUTTO")}</span><strong>{fixed(quote.gross, 2)} zł</strong></div>
            <p className="muted" style={{ marginTop: 12 }}>
              {quote.pricingSource === "custom" ? t("Indywidualny cennik kontrahenta.") : t("Cena standardowa MATT dla tej pozycji.")}<br />
              {t("Wszystkie ceny B2B są cenami NETTO + 8% VAT.")}</p>
          </>
        ) : (
          <p className="muted">{t("Wycena pojawi się po wskazaniu dokładnego adresu pasażera.")}</p>
        )}

        <button className="btn" style={{ width: "100%", marginTop: 16 }} disabled={saving || quoteBusy || !quote} onClick={submit}>
          {saving ? t("ZAMAWIANIE...") : t("ZAMÓW TRANSPORT")}
        </button>
        {message && <div className="admin-save-message">{message}</div>}
      </aside>
    </div>
  );
}
