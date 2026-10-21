"use client";
import { customerFetch } from "@/lib/customerFetch";
import { useCustomerLocale } from "@/lib/useCustomerLocale";
import { companyText } from "@/lib/companyCopy";
import { withCustomerLocale } from "@/lib/bookingLocale";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CompanyAddressesManager({
  addresses,
  canManage
}: {
  addresses: any[];
  canManage: boolean;
}) {
 const fetchCustomer=(input:RequestInfo|URL,init?:RequestInit)=>customerFetch(locale,input,init);
  const locale=useCustomerLocale();
  const t=(key:string)=>companyText(key,locale);
  const href=(path:string)=>withCustomerLocale(path,locale);
  const router = useRouter();
  const [form, setForm] = useState({ id: "", label: "", address: "" });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!canManage || saving) return;
    if (form.label.trim().length < 2 || form.address.trim().length < 5) {
      setMessage(t("Podaj nazwę i pełny adres."));
      return;
    }
    setSaving(true);
    setMessage("");
    const response = await fetchCustomer("/api/company/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale, action: form.id ? "update" : "create", ...form })
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setMessage(data.error || t("Nie udało się zapisać adresu."));
      return;
    }
    setForm({ id: "", label: "", address: "" });
    setMessage(t("✓ Adres zapisany."));
    router.refresh();
  }

  async function remove(id: string) {
    if (!canManage || !window.confirm(t("Usunąć ten zapisany adres?"))) return;
    const response = await fetchCustomer("/api/company/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale, action: "delete", id })
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || t("Nie udało się usunąć adresu."));
      return;
    }
    setMessage(t("✓ Adres usunięty."));
    if (form.id === id) setForm({ id: "", label: "", address: "" });
    router.refresh();
  }

  return (
    <div className="card company-addresses-card">
      <div className="company-section-head">
        <div>
          <h2>{t("Zapisane adresy")}</h2>
          <p className="muted">{t("Stałe miejsca firmy dostępne jednym kliknięciem podczas zamawiania transportu.")}</p>
        </div>
      </div>

      {addresses.length ? (
        <div className="company-address-list">
          {addresses.map((item: any) => (
            <div className="company-address-row" key={item.id}>
              <div><strong>{item.label}</strong><span>{item.address}</span></div>
              {canManage && (
                <div className="manager-actions">
                  <button className="btn secondary company-small-btn" type="button" onClick={() => setForm({ id: item.id, label: item.label || "", address: item.address || "" })}>{t("EDYTUJ")}</button>
                  <button className="btn secondary company-small-btn" type="button" onClick={() => remove(item.id)}>{t("USUŃ")}</button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : <p className="muted">{t("Nie zapisano jeszcze żadnego stałego adresu.")}</p>}

      {canManage && (
        <div className="company-address-form">
          <h3>{form.id ? t("Edytuj adres") : t("Dodaj adres")}</h3>
          <div className="grid">
            <label>{t("Nazwa miejsca")}<input value={form.label} placeholder={t("np. Biuro Rybnik")} onChange={(e) => setForm({ ...form, label: e.target.value })} /></label>
            <label>{t("Pełny adres")}<input value={form.address} placeholder={t("ulica, numer, miasto")} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
          </div>
          <div className="manager-actions">
            <button className="btn" type="button" disabled={saving} onClick={save}>{saving ? t("ZAPISYWANIE...") : form.id ? t("ZAPISZ ZMIANY") : t("DODAJ ADRES")}</button>
            {form.id && <button className="btn secondary" type="button" onClick={() => setForm({ id: "", label: "", address: "" })}>{t("ANULUJ")}</button>}
          </div>
        </div>
      )}
      {message && <div className="admin-save-message">{message}</div>}
    </div>
  );
}
