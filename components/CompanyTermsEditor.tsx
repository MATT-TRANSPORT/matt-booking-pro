"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PRICES } from "@/lib/pricing";

type PriceMap = Record<string, { car?: number | string | null; bus?: number | string | null }>;

export default function CompanyTermsEditor({
  company,
  currentTerms,
  currentPrices,
  history
}: {
  company: any;
  currentTerms?: any | null;
  currentPrices?: any[];
  history?: any[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const initialPrices: PriceMap = {};
  for (const [key] of Object.entries(PRICES)) {
    const row = (currentPrices || []).find((x: any) => x.airport_key === key);
    initialPrices[key] = {
      car: row?.car_price_net ?? "",
      bus: row?.bus_price_net ?? ""
    };
  }

  const [form, setForm] = useState({
    effectiveFrom: new Date().toISOString().slice(0, 10),
    headquartersAddress:
      currentTerms?.headquarters_address || company.address || "",
    headquartersPlaceId: currentTerms?.headquarters_place_id || "",
    paymentDays: Number(currentTerms?.payment_days ?? company.payment_days ?? 14),
    discount: Number(currentTerms?.discount_percent ?? company.discount_percent ?? 0),
    freeKm: Number(currentTerms?.free_km ?? company.free_pickup_km ?? 40),
    extraKmRateNet: Number(currentTerms?.extra_km_rate_net ?? 2.4),
    defaultPayment:
      currentTerms?.default_payment_method ||
      company.default_payment_method ||
      "company_transfer",
    useCustomPricing: Boolean(
      currentTerms?.use_custom_pricing ?? company.use_custom_pricing
    ),
    notes: currentTerms?.notes ?? company.internal_notes ?? "",
    prices: initialPrices
  });

  async function headquartersChanged(value: string) {
    setForm((prev) => ({
      ...prev,
      headquartersAddress: value,
      headquartersPlaceId: ""
    }));

    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const response = await fetch(
      `/api/places?q=${encodeURIComponent(value)}`
    );
    const data = await response.json();
    setSuggestions(data.suggestions ?? []);
  }

  function setPrice(airport: string, vehicle: "car" | "bus", value: string) {
    setForm((prev) => ({
      ...prev,
      prices: {
        ...prev.prices,
        [airport]: {
          ...prev.prices[airport],
          [vehicle]: value
        }
      }
    }));
  }

  async function save() {
    if (!form.headquartersAddress.trim()) {
      setMessage("Podaj siedzibę kontrahenta do kalkulacji kilometrów.");
      return;
    }

    setSaving(true);
    setMessage("Zapisywanie nowej wersji warunków...");

    const response = await fetch("/api/admin/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "terms",
        id: company.id,
        ...form
      })
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Nie udało się zapisać warunków.");
      setSaving(false);
      return;
    }

    setMessage("✓ Nowa wersja warunków handlowych została zapisana.");
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="card b2b-terms-card">
      <div className="company-section-head">
        <div>
          <span className="badge">B2B PRO</span>
          <h2>Warunki handlowe</h2>
          <p className="muted">
            Zapis tworzy nową wersję. Stare rezerwacje zachowują swój snapshot ceny.
          </p>
        </div>
      </div>

      <div className="b2b-vat-note">
        Wszystkie ceny B2B są cenami <strong>NETTO</strong>. Do ceny system dolicza <strong>8% VAT</strong>.
      </div>

      <div className="grid">
        <label>
          Warunki ważne od
          <input
            type="date"
            value={form.effectiveFrom}
            onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
          />
        </label>

        <label>
          Termin płatności (dni)
          <input
            type="number"
            min="0"
            value={form.paymentDays}
            onChange={(e) => setForm({ ...form, paymentDays: Number(e.target.value) })}
          />
        </label>
      </div>

      <label style={{ marginTop: 12, position: "relative" }}>
        Siedziba kontrahenta do kalkulacji km
        <input
          value={form.headquartersAddress}
          autoComplete="off"
          onChange={(e) => headquartersChanged(e.target.value)}
        />
        {suggestions.length > 0 && (
          <div className="address-suggestions">
            {suggestions.slice(0, 5).map((s: any, i: number) => (
              <button
                key={s.placeId ?? i}
                type="button"
                onClick={() => {
                  setForm((prev) => ({
                    ...prev,
                    headquartersAddress: s.text ?? "",
                    headquartersPlaceId: s.placeId ?? ""
                  }));
                  setSuggestions([]);
                }}
              >
                {s.text}
              </button>
            ))}
          </div>
        )}
      </label>

      <div className="grid" style={{ marginTop: 12 }}>
        <label>
          Limit bez dopłaty od siedziby (km)
          <input
            type="number"
            min="0"
            step="0.1"
            value={form.freeKm}
            onChange={(e) => setForm({ ...form, freeKm: Number(e.target.value) })}
          />
        </label>

        <label>
          Dopłata powyżej limitu (zł netto/km)
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.extraKmRateNet}
            onChange={(e) =>
              setForm({ ...form, extraKmRateNet: Number(e.target.value) })
            }
          />
        </label>

        <label>
          Rabat dodatkowy %
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={form.discount}
            onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })}
          />
        </label>

        <label>
          Domyślna płatność
          <select
            value={form.defaultPayment}
            onChange={(e) => setForm({ ...form, defaultPayment: e.target.value })}
          >
            <option value="company_transfer">Przelew firmowy</option>
            <option value="employee_payment">Płatność pracownika</option>
          </select>
        </label>
      </div>

      <label style={{ marginTop: 12 }}>
        Cennik
        <select
          value={form.useCustomPricing ? "1" : "0"}
          onChange={(e) =>
            setForm({ ...form, useCustomPricing: e.target.value === "1" })
          }
        >
          <option value="0">Standardowy MATT</option>
          <option value="1">Indywidualny / mieszany</option>
        </select>
      </label>

      <div className="b2b-price-editor">
        <div className="b2b-price-editor-head">
          <strong>Lotnisko</strong>
          <strong>Samochód NETTO</strong>
          <strong>Bus NETTO</strong>
        </div>
        {Object.entries(PRICES).map(([key, standard]) => (
          <div className="b2b-price-editor-row" key={key}>
            <div>
              <strong>{standard.label}</strong>
              <small>
                Standard: {standard.car.toFixed(2)} / {standard.bus.toFixed(2)} zł netto
              </small>
            </div>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder={String(standard.car)}
              value={form.prices[key]?.car ?? ""}
              disabled={!form.useCustomPricing}
              onChange={(e) => setPrice(key, "car", e.target.value)}
            />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder={String(standard.bus)}
              value={form.prices[key]?.bus ?? ""}
              disabled={!form.useCustomPricing}
              onChange={(e) => setPrice(key, "bus", e.target.value)}
            />
          </div>
        ))}
      </div>

      <p className="muted" style={{ marginTop: 8 }}>
        Puste pole w cenniku indywidualnym = użyj standardowej ceny MATT dla tej pozycji.
      </p>

      <label style={{ marginTop: 12 }}>
        Notatki handlowe
        <textarea
          rows={4}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </label>

      <button className="btn" disabled={saving} onClick={save}>
        {saving ? "ZAPISYWANIE..." : "ZAPISZ NOWĄ WERSJĘ WARUNKÓW"}
      </button>

      {message && <div className="admin-save-message">{message}</div>}

      {(history || []).length > 0 && (
        <div className="b2b-terms-history">
          <h3>Historia wersji</h3>
          {(history || []).slice(0, 8).map((item: any) => (
            <div key={item.id}>
              <strong>Od {item.effective_from}</strong>
              <span>
                {Number(item.free_km).toFixed(1)} km bez dopłaty · {Number(item.extra_km_rate_net).toFixed(2)} zł netto/km · VAT {Number(item.vat_rate).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
