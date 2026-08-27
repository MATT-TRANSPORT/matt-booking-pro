"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PRICES } from "@/lib/pricing";

export default function CompanyTermsEditor({
  company,
  terms,
  prices
}: {
  company: any;
  terms?: any | null;
  prices?: any[];
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const initialPrices = useMemo(() => {
    const out: Record<string, { car: string; bus: string }> = {};
    for (const key of Object.keys(PRICES)) {
      const row = (prices ?? []).find((x: any) => x.airport_key === key);
      out[key] = {
        car: row?.car_price_net == null ? "" : String(row.car_price_net),
        bus: row?.bus_price_net == null ? "" : String(row.bus_price_net)
      };
    }
    return out;
  }, [prices]);

  const [f, setF] = useState({
    pricingOriginAddress:
      terms?.pricing_origin_address ||
      company.pricing_origin_address ||
      company.address ||
      "",
    effectiveFrom: terms?.effective_from || today,
    freeKm: Number(terms?.free_km ?? company.free_pickup_km ?? 40),
    extraKmRateNet: Number(terms?.extra_km_rate_net ?? 2.4),
    paymentDays: Number(terms?.payment_days ?? company.payment_days ?? 14),
    defaultPaymentMethod:
      terms?.default_payment_method || company.default_payment_method || "company_transfer",
    useCustomPricing: Boolean(terms?.use_custom_pricing ?? company.use_custom_pricing),
    notes: terms?.commercial_notes ?? company.internal_notes ?? ""
  });
  const [priceMap, setPriceMap] = useState(initialPrices);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (f.pricingOriginAddress.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/places?q=${encodeURIComponent(f.pricingOriginAddress)}`);
        const d = await r.json();
        setSuggestions(d.suggestions ?? []);
      } catch {
        setSuggestions([]);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [f.pricingOriginAddress]);

  function updatePrice(key: string, vehicle: "car" | "bus", value: string) {
    setPriceMap((current) => ({
      ...current,
      [key]: { ...current[key], [vehicle]: value }
    }));
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setMsg("");

    const r = await fetch(`/api/admin/companies/${company.id}/commercial-terms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, prices: priceMap })
    });
    const d = await r.json();

    if (!r.ok) {
      setMsg(d.error ?? "Nie udało się zapisać warunków.");
      setSaving(false);
      return;
    }

    setMsg("✓ Zapisano nową wersję warunków handlowych.");
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="card">
      <span className="badge">B2B PRO</span>
      <h2>Warunki handlowe</h2>
      <p className="muted">
        Każdy zapis tworzy nową wersję. Stare rezerwacje zachowują wcześniejszą wycenę.
      </p>

      <div className="grid">
        <label style={{ position: "relative" }}>
          Siedziba kontrahenta do kalkulacji km
          <input
            value={f.pricingOriginAddress}
            onChange={(e) => setF({ ...f, pricingOriginAddress: e.target.value })}
            autoComplete="off"
          />
          {suggestions.length > 0 && (
            <div className="address-suggestions">
              {suggestions.slice(0, 5).map((s: any, i: number) => (
                <button
                  key={s.placeId ?? i}
                  type="button"
                  onClick={() => {
                    setF({ ...f, pricingOriginAddress: s.text ?? "" });
                    setSuggestions([]);
                  }}
                >
                  {s.text}
                </button>
              ))}
            </div>
          )}
        </label>
        <label>
          Warunki ważne od
          <input
            type="date"
            value={f.effectiveFrom}
            onChange={(e) => setF({ ...f, effectiveFrom: e.target.value })}
          />
        </label>
        <label>
          Limit bez dopłaty od siedziby (km)
          <input
            type="number"
            min="0"
            step="0.1"
            value={f.freeKm}
            onChange={(e) => setF({ ...f, freeKm: Number(e.target.value) })}
          />
        </label>
        <label>
          Dopłata powyżej limitu (zł netto/km)
          <input
            type="number"
            min="0"
            step="0.01"
            value={f.extraKmRateNet}
            onChange={(e) => setF({ ...f, extraKmRateNet: Number(e.target.value) })}
          />
        </label>
        <label>
          Termin płatności (dni)
          <input
            type="number"
            min="0"
            value={f.paymentDays}
            onChange={(e) => setF({ ...f, paymentDays: Number(e.target.value) })}
          />
        </label>
        <label>
          Domyślna płatność
          <select
            value={f.defaultPaymentMethod}
            onChange={(e) => setF({ ...f, defaultPaymentMethod: e.target.value })}
          >
            <option value="company_transfer">Przelew firmowy</option>
            <option value="employee_payment">Płatność online firmy</option>
          </select>
        </label>
        <label>
          Indywidualne ceny lotnisk
          <select
            value={f.useCustomPricing ? "1" : "0"}
            onChange={(e) => setF({ ...f, useCustomPricing: e.target.value === "1" })}
          >
            <option value="0">Wyłączone — ceny standardowe MATT</option>
            <option value="1">Włączone</option>
          </select>
        </label>
        <label>
          VAT
          <input value="8%" disabled />
        </label>
      </div>

      <div style={{ marginTop: 18 }}>
        <h3>Indywidualny cennik lotnisk — ceny NETTO</h3>
        <p className="muted">
          Puste pole oznacza automatyczny fallback do standardowej ceny MATT.
        </p>
        <div className="company-bookings-table">
          <table className="table">
            <thead>
              <tr>
                <th>Lotnisko</th>
                <th>Samochód netto</th>
                <th>Bus netto</th>
                <th>Standard MATT</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(PRICES).map(([key, row]) => (
                <tr key={key}>
                  <td><strong>{row.label}</strong></td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={`${row.car}`}
                      value={priceMap[key]?.car ?? ""}
                      disabled={!f.useCustomPricing}
                      onChange={(e) => updatePrice(key, "car", e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={`${row.bus}`}
                      value={priceMap[key]?.bus ?? ""}
                      disabled={!f.useCustomPricing}
                      onChange={(e) => updatePrice(key, "bus", e.target.value)}
                    />
                  </td>
                  <td>{row.car} / {row.bus} zł netto</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <label style={{ marginTop: 14 }}>
        Uwagi / warunki dodatkowe
        <textarea
          rows={4}
          value={f.notes}
          onChange={(e) => setF({ ...f, notes: e.target.value })}
        />
      </label>

      <div style={{ marginTop: 12, padding: 12, border: "1px solid #4f4733", borderRadius: 10 }}>
        <strong>Wszystkie ceny B2B są cenami NETTO. Do ceny doliczany jest VAT 8%.</strong>
      </div>

      <button className="btn" style={{ marginTop: 14 }} disabled={saving} onClick={save}>
        {saving ? "ZAPISYWANIE..." : "ZAPISZ NOWĄ WERSJĘ WARUNKÓW"}
      </button>
      {msg && <div className="admin-save-message">{msg}</div>}
    </div>
  );
}
