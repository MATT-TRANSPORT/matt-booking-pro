"use client";
import { customerFetch } from "@/lib/customerFetch";
import { customerFlightStatus } from "@/lib/customerFlightText";
import { useCustomerLocale } from "@/lib/useCustomerLocale";

import { useEffect, useState } from "react";

const STATUS: Record<string, string> = {
  pending: "Oczekuje na potwierdzenie",
  confirmed: "Potwierdzona",
  assigned: "Kierowca i pojazd",
  in_progress: "Kierowca w drodze",
  arrived: "Kierowca na miejscu",
  picked_up: "Pasażer odebrany",
  completed: "Zakończona",
  cancelled: "Anulowana"
};

function one(value: any) {
  return Array.isArray(value) ? value[0] : value;
}

function shortDate(value: unknown,locale:string) {
  if (!value) return "—";
  try { return new Date(String(value)).toLocaleString(locale); } catch { return String(value); }
}

export default function ClientOperationalStatus({ token }: { token: string }) {
 const fetchCustomer=(input:RequestInfo|URL,init?:RequestInit)=>customerFetch(locale,input,init);
  const [data, setData] = useState<any>(null);
  const locale = useCustomerLocale(data?.booking?.customer_locale);
  const t = (pl: string, en: string, de: string, cs: string) => ({pl,en,de,cs}[locale as "pl"|"en"|"de"|"cs"] || pl);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const r = await fetchCustomer(`/api/client-booking/${token}/status?lang=${locale}`, { cache: "no-store" });
        const d = await r.json();
        if (!active) return;
        if (!r.ok) { setError(d.error || t("Nie udało się pobrać statusu.","Could not load trip status.","Der Fahrtstatus konnte nicht geladen werden.","Stav jízdy se nepodařilo načíst.")); return; }
        setData(d);
        setError("");
      } catch {
        if (active) setError(t("Nie udało się odświeżyć statusu.","Could not refresh trip status.","Der Fahrtstatus konnte nicht aktualisiert werden.","Stav jízdy se nepodařilo aktualizovat."));
      }
    }
    void load();
    const timer = window.setInterval(load, 60_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [token,locale]);

  const booking = data?.booking;
  const driver = one(booking?.drivers);
  const vehicle = one(booking?.vehicles);
  const returnDriver = one(booking?.return_driver);
  const returnVehicle = one(booking?.return_vehicle);

  if (!booking && !error) return null;

  return <section className="card" style={{ margin: "18px auto", maxWidth: 960 }}>
    <div className="company-section-head">
      <div>
        <span className="badge">{t("STATUS PRZEJAZDU · LIVE","LIVE TRIP STATUS","FAHRTSTATUS · LIVE","STAV JÍZDY · ŽIVĚ")}</span>
        <p className="muted" style={{ margin: "6px 0 0" }}>{t("Status odświeża się automatycznie co minutę.","Status refreshes automatically every minute.","Der Status wird jede Minute automatisch aktualisiert.","Stav se automaticky aktualizuje každou minutu.")}</p>
      </div>
      {booking?.status === "cancelled" && <span className="status cancelled">{t("ANULOWANA","CANCELLED","STORNIERT","ZRUŠENO")}</span>}
      {booking?.status === "pending" && <span className="status pending">{t("OCZEKUJE","PENDING","AUSSTEHEND","ČEKÁ")}</span>}
    </div>

    {error && <div className="admin-save-message">{error}</div>}

    <div className="client-live-status-current">
      <span className="badge">{t("AKTUALNY STATUS","CURRENT STATUS","AKTUELLER STATUS","AKTUÁLNÍ STAV")}</span>
      <strong>{({pending:t("Oczekuje na potwierdzenie","Awaiting confirmation","Bestätigung ausstehend","Čeká na potvrzení"),confirmed:t("Potwierdzona","Confirmed","Bestätigt","Potvrzeno"),assigned:t("Kierowca i pojazd","Driver and vehicle","Fahrer und Fahrzeug","Řidič a vozidlo"),in_progress:t("Kierowca w drodze","Driver on the way","Fahrer unterwegs","Řidič na cestě"),arrived:t("Kierowca na miejscu","Driver arrived","Fahrer vor Ort","Řidič na místě"),picked_up:t("Pasażer odebrany","Passenger picked up","Fahrgast abgeholt","Cestující vyzvednut"),completed:t("Zakończona","Completed","Abgeschlossen","Dokončeno"),cancelled:t("Anulowana","Cancelled","Storniert","Zrušeno")}[String(booking?.status || "pending")] || String(booking?.status || "pending"))}</strong>
    </div>

    {booking && <div className="grid" style={{ marginTop: 16 }}>
      <div style={{ padding: 14, border: "1px solid #343b49", borderRadius: 12 }}>
        <small className="muted">{t("KIEROWCA","DRIVER","FAHRER","ŘIDIČ")}</small><br/>
        <strong>{driver?.full_name || t("Jeszcze nie przypisano","Not assigned yet","Noch nicht zugewiesen","Zatím nepřiřazeno")}</strong><br/>
        {driver?.phone && <a href={`tel:${driver.phone}`}>{driver.phone}</a>}
      </div>
      <div style={{ padding: 14, border: "1px solid #343b49", borderRadius: 12 }}>
        <small className="muted">{t("POJAZD","VEHICLE","FAHRZEUG","VOZIDLO")}</small><br/>
        <strong>{vehicle ? `${vehicle.name}${vehicle.registration ? ` · ${vehicle.registration}` : ""}` : t("Jeszcze nie przypisano","Not assigned yet","Noch nicht zugewiesen","Zatím nepřiřazeno")}</strong>
      </div>
      {booking.service_type === "roundtrip" && <>
        <div style={{ padding: 14, border: "1px solid #343b49", borderRadius: 12 }}>
          <small className="muted">{t("KIEROWCA POWROTU","RETURN DRIVER","RÜCKFAHRT-FAHRER","ŘIDIČ ZPÁTEČNÍ CESTY")}</small><br/>
          <strong>{returnDriver?.full_name || driver?.full_name || t("Jeszcze nie przypisano","Not assigned yet","Noch nicht zugewiesen","Zatím nepřiřazeno")}</strong><br/>
          {(returnDriver?.phone || driver?.phone) && <a href={`tel:${returnDriver?.phone || driver?.phone}`}>{returnDriver?.phone || driver?.phone}</a>}
        </div>
        <div style={{ padding: 14, border: "1px solid #343b49", borderRadius: 12 }}>
          <small className="muted">{t("POJAZD POWROTU","RETURN VEHICLE","RÜCKFAHRT-FAHRZEUG","VOZIDLO ZPÁTEČNÍ CESTY")}</small><br/>
          <strong>{returnVehicle ? `${returnVehicle.name}${returnVehicle.registration ? ` · ${returnVehicle.registration}` : ""}` : vehicle ? `${vehicle.name}${vehicle.registration ? ` · ${vehicle.registration}` : ""}` : t("Jeszcze nie przypisano","Not assigned yet","Noch nicht zugewiesen","Zatím nepřiřazeno")}</strong>
        </div>
      </>}
    </div>}

    {!!data?.flights?.length && <div style={{ marginTop: 18 }}>
      <h3>{t("Monitor lotu","Flight monitor","Flugüberwachung","Sledování letu")}</h3>
      {data.flights.map((f: any) => <div className="row" key={`${f.leg}-${f.flight_number}`}>
        <span><strong>{f.leg === "return" ? t("POWRÓT · ","RETURN · ","RÜCKFAHRT · ","NÁVRAT · ") : ""}{f.flight_number}</strong><br/><small className="muted">{t("Aktualizacja:","Updated:","Aktualisiert:","Aktualizováno:")} {shortDate(f.updated_at,locale)}</small></span>
        <span><strong>{customerFlightStatus(f.status,locale).toUpperCase()}</strong><br/><small className="muted">ETA: {shortDate(f.estimated_arrival || f.scheduled_arrival,locale)}</small></span>
      </div>)}
    </div>}

    {!!data?.alerts?.length && <div style={{ marginTop: 14 }}>
      {data.alerts.slice(0,3).map((a: any, i: number) => <div key={i} style={{ marginTop: 8, padding: 12, borderRadius: 10, border: a.severity === "critical" ? "1px solid #dc2626" : "1px solid #d5ae5d" }}>
        <strong>{a.title}</strong><div className="muted">{a.message}</div>
      </div>)}
    </div>}
  </section>;
}
