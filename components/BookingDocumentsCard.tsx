"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TYPE_LABELS: Record<string, string> = {
  invoice: "Faktura",
  correction: "Korekta",
  payment_confirmation: "Potwierdzenie płatności",
  other: "Inny dokument"
};

export default function BookingDocumentsCard({
  bookingId,
  documents
}: {
  bookingId: string;
  documents: any[];
}) {
  const router = useRouter();
  const [documentType, setDocumentType] = useState("invoice");
  const [documentNumber, setDocumentNumber] = useState("");
  const [visibleToCompany, setVisibleToCompany] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function upload() {
    if (!file) {
      setMessage("Dodaj plik PDF/JPG/PNG.");
      return;
    }

    setSaving(true);
    setMessage("Wysyłanie dokumentu...");

    const form = new FormData();
    form.append("documentType", documentType);
    form.append("documentNumber", documentNumber);
    form.append("visibleToCompany", String(visibleToCompany));
    form.append("file", file);

    const response = await fetch(`/api/admin/bookings/${bookingId}/documents`, {
      method: "POST",
      body: form
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Nie udało się dodać dokumentu.");
      setSaving(false);
      return;
    }

    setMessage("✓ Dokument dodany.");
    setFile(null);
    setDocumentNumber("");
    setSaving(false);
    router.refresh();
  }

  async function remove(documentId: string) {
    if (!window.confirm("Usunąć ten dokument z rezerwacji?")) return;

    const response = await fetch(`/api/admin/bookings/${bookingId}/documents`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId })
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Nie udało się usunąć dokumentu.");
      return;
    }

    setMessage("✓ Dokument usunięty.");
    router.refresh();
  }

  return (
    <div className="card booking-documents-card" style={{ marginTop: 16 }}>
      <span className="badge">B2B PRO</span>
      <h2>Faktury / dokumenty</h2>
      <p className="muted">
        Do pojedynczej rezerwacji możesz przypiąć PDF, JPG lub PNG. Pliki są prywatne; firma dostaje czasowy link dopiero po autoryzacji.
      </p>

      <div className="grid">
        <label>
          Typ dokumentu
          <select value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
            <option value="invoice">Faktura</option>
            <option value="correction">Korekta</option>
            <option value="payment_confirmation">Potwierdzenie płatności</option>
            <option value="other">Inny dokument</option>
          </select>
        </label>
        <label>
          Numer dokumentu
          <input
            placeholder="np. FV/08/2026/123"
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
          />
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

      <label className="portal-create-toggle">
        <input
          type="checkbox"
          checked={visibleToCompany}
          onChange={(e) => setVisibleToCompany(e.target.checked)}
        />
        Dokument widoczny dla kontrahenta w portalu B2B
      </label>

      <button className="btn" disabled={saving} onClick={upload}>
        {saving ? "WYSYŁANIE..." : "DODAJ DOKUMENT"}
      </button>

      {message && <div className="admin-save-message">{message}</div>}

      <div className="booking-document-list">
        {(documents || []).length === 0 ? (
          <p className="muted">Brak dokumentów przypisanych do tej rezerwacji.</p>
        ) : (
          documents.map((doc: any) => (
            <div className="booking-document-row" key={doc.id}>
              <div>
                <strong>{TYPE_LABELS[doc.document_type] || doc.document_type}</strong>
                <span>{doc.document_number || doc.file_name}</span>
                <small>
                  {new Date(doc.created_at).toLocaleString("pl-PL")} · {doc.visible_to_company ? "widoczny dla firmy" : "tylko MATT"}
                </small>
              </div>
              <div className="booking-document-actions">
                <a
                  className="btn secondary company-small-btn"
                  href={`/api/admin/bookings/${bookingId}/documents/${doc.id}/download`}
                  target="_blank"
                  rel="noreferrer"
                >
                  OTWÓRZ
                </a>
                <button
                  className="btn secondary company-small-btn"
                  type="button"
                  onClick={() => remove(doc.id)}
                >
                  USUŃ
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
