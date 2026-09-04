"use client";

import { useState } from "react";

export default function CompanyAdminActions({ company }: { company: any }) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [form, setForm] = useState({
    name: company.name || "",
    nip: company.nip || "",
    email: company.email || "",
    phone: company.phone || "",
    contactPerson: company.contact_person || "",
    active: company.active !== false
  });

  async function save() {
    setSaving(true);
    setMessage("");

    const response = await fetch("/api/admin/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", id: company.id, ...form })
    });

    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      setMessage(data.error || "Nie udało się zapisać zmian.");
      return;
    }

    setMessage("✓ Dane firmy zostały zapisane.");
    setTimeout(() => window.location.reload(), 500);
  }

  async function remove() {
    if (confirmName !== company.name) {
      setMessage("Wpisz pełną nazwę firmy, aby potwierdzić usunięcie.");
      return;
    }

    setSaving(true);
    setMessage("");

    const response = await fetch("/api/admin/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "delete",
        id: company.id,
        confirmName
      })
    });

    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      setMessage(data.error || "Nie udało się usunąć firmy.");
      return;
    }

    window.location.href = "/panel/firmy";
  }

  return (
    <div className="company-admin-actions">
      <div className="company-admin-action-buttons">
        <button
          className="btn secondary company-small-btn"
          type="button"
          onClick={() => {
            setEditing(!editing);
            setDeleting(false);
            setMessage("");
          }}
        >
          {editing ? "ZAMKNIJ EDYCJĘ" : "EDYTUJ DANE FIRMY"}
        </button>

        <button
          className="btn secondary company-small-btn company-delete-btn"
          type="button"
          onClick={() => {
            setDeleting(!deleting);
            setEditing(false);
            setMessage("");
          }}
        >
          USUŃ FIRMĘ
        </button>
      </div>

      {editing && (
        <div className="company-admin-edit-form">
          <label>
            Nazwa firmy
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label>
            NIP
            <input value={form.nip} onChange={(e) => setForm({ ...form, nip: e.target.value })} />
          </label>
          <label>
            E-mail
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>
            Telefon
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label>
            Osoba kontaktowa
            <input
              value={form.contactPerson}
              onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
            />
          </label>
          <label className="company-active-toggle">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Firma aktywna
          </label>
          <button className="btn" type="button" disabled={saving} onClick={save}>
            {saving ? "ZAPISYWANIE..." : "ZAPISZ DANE FIRMY"}
          </button>
        </div>
      )}

      {deleting && (
        <div className="company-delete-confirm">
          <strong>Trwałe usunięcie firmy</strong>
          <p>
            Usunięcie jest dostępne tylko dla firmy bez historii rezerwacji. Jeśli firma ma rezerwacje,
            system zablokuje operację i pozwoli jedynie oznaczyć ją jako nieaktywną.
          </p>
          <label>
            Wpisz dokładnie: <b>{company.name}</b>
            <input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} />
          </label>
          <button
            className="btn company-delete-confirm-btn"
            type="button"
            disabled={saving || confirmName !== company.name}
            onClick={remove}
          >
            {saving ? "USUWANIE..." : "TAK, USUŃ FIRMĘ"}
          </button>
        </div>
      )}

      {message && (
        <div className={message.startsWith("✓") ? "admin-save-message" : "booking-error"}>{message}</div>
      )}
    </div>
  );
}
