"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SettlementUpload({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [period, setPeriod] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function upload() {
    if (!period || !invoiceNumber || !file) {
      setMessage("Wybierz miesiąc, wpisz numer faktury i dodaj plik.");
      return;
    }

    setSaving(true);
    setMessage("Wysyłanie dokumentu...");

    const form = new FormData();
    form.append("companyId", companyId);
    form.append("period", period);
    form.append("invoiceNumber", invoiceNumber);
    form.append("file", file);

    const response = await fetch("/api/admin/settlements", {
      method: "POST",
      body: form
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Nie udało się zapisać rozliczenia.");
      setSaving(false);
      return;
    }

    setMessage(`✓ Rozliczenie zapisane: ${Number(data.amount).toFixed(2)} zł brutto`);
    setSaving(false);
    setInvoiceNumber("");
    setFile(null);
    router.refresh();
  }

  return (
    <div className="card">
      <h2>Dodaj rozliczenie / fakturę</h2>
      <p className="muted">
        System nie wystawia faktury. Dołączasz dokument wystawiony w swoim systemie/KSeF.
      </p>
      <div className="grid">
        <label>
          Miesiąc
          <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
        </label>
        <label>
          Numer faktury
          <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
        </label>
      </div>
      <label style={{ marginTop: 12 }}>
        PDF / JPG / PNG
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>
      <button className="btn" style={{ marginTop: 14 }} disabled={saving} onClick={upload}>
        {saving ? "WYSYŁANIE..." : "ZAPISZ ROZLICZENIE"}
      </button>
      {message && <div className="admin-save-message">{message}</div>}
    </div>
  );
}
