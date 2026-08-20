"use client";

import { useState } from "react";

export default function CompanyCreateForm() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: "",
    nip: "",
    email: "",
    phone: "",
    contactPerson: "",
    headquartersAddress: "",
    headquartersPlaceId: "",
    paymentDays: 14,
    discount: 0,
    freeKm: 40,
    extraKmRateNet: 2.4,
    defaultPayment: "company_transfer",
    useCustomPricing: false,
    notes: "",
    createPortal: true
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

  async function save() {
    if (!form.name.trim()) {
      setMessage("Podaj nazwę firmy.");
      return;
    }
    if (!form.headquartersAddress.trim()) {
      setMessage("Podaj siedzibę kontrahenta do kalkulacji B2B.");
      return;
    }

    setSaving(true);
    setMessage("");

    const response = await fetch("/api/admin/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", ...form })
    });
    const data = await response.json();

    if (!response.ok && response.status !== 201) {
      setMessage(data.error ?? "Błąd zapisu.");
      setSaving(false);
      return;
    }

    if (form.createPortal && form.email && data.id) {
      await fetch("/api/admin/portal-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "company", id: data.id })
      });
    }

    window.location.href = `/panel/firmy/${data.id}`;
  }

  return (
    <div className="company-create-wrap">
      <button className="btn" onClick={() => setOpen(!open)}>
        + DODAJ FIRMĘ
      </button>

      {open && (
        <div className="card company-create-form">
          <span className="badge">B2B PRO</span>
          <h2>Nowa firma</h2>

          <div className="grid">
            <label>
              Nazwa firmy *
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              NIP
              <input
                value={form.nip}
                onChange={(e) => setForm({ ...form, nip: e.target.value })}
              />
            </label>
            <label>
              E-mail
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label>
              Telefon
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </label>
            <label>
              Osoba kontaktowa
              <input
                value={form.contactPerson}
                onChange={(e) =>
                  setForm({ ...form, contactPerson: e.target.value })
                }
              />
            </label>
            <label>
              Termin płatności
              <input
                type="number"
                value={form.paymentDays}
                onChange={(e) =>
                  setForm({ ...form, paymentDays: Number(e.target.value) })
                }
              />
            </label>
          </div>

          <label style={{ marginTop: 12, position: "relative" }}>
            Siedziba kontrahenta do kalkulacji km *
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
              Limit bez dopłaty (km)
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.freeKm}
                onChange={(e) =>
                  setForm({ ...form, freeKm: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Dopłata ponad limit (zł netto/km)
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
              Rabat %
              <input
                type="number"
                step="0.1"
                value={form.discount}
                onChange={(e) =>
                  setForm({ ...form, discount: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Domyślna płatność
              <select
                value={form.defaultPayment}
                onChange={(e) =>
                  setForm({ ...form, defaultPayment: e.target.value })
                }
              >
                <option value="company_transfer">Przelew firmowy</option>
                <option value="employee_payment">Płatność pracownika</option>
              </select>
            </label>
          </div>

          <div className="b2b-vat-note" style={{ marginTop: 14 }}>
            Wszystkie ceny B2B: <strong>NETTO + 8% VAT</strong>.
          </div>

          <label className="portal-create-toggle">
            <input
              type="checkbox"
              checked={form.createPortal}
              onChange={(e) =>
                setForm({ ...form, createPortal: e.target.checked })
              }
            />
            Utwórz konto administratora firmy i wyślij link do ustawienia hasła
          </label>

          <label style={{ marginTop: 12 }}>
            Notatki wewnętrzne
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>

          {message && <div className="booking-error">{message}</div>}
          <button className="btn" onClick={save} disabled={saving}>
            {saving ? "ZAPISYWANIE..." : "UTWÓRZ FIRMĘ"}
          </button>
        </div>
      )}
    </div>
  );
}
