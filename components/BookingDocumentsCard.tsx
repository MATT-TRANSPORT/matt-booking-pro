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
  documents,
  canManage = false
}: {
  bookingId: string;
  documents: any[];
  canManage?: boolean;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("invoice");
  const [documentNumber, setDocumentNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function upload() {
    if (!file) {
      setMessage("Wybierz plik PDF, JPG lub PNG.");
      return;
    }

    setBusy(true);
    setMessage("Wysyłanie dokumentu...");

    const form = new FormData();
    form.append("file", file);
    form.append("documentType", documentType);
    form.append("documentNumber", documentNumber);

    const r = await fetch(`/api/admin/bookings/${bookingId}/documents`, {
      method: "POST",
      body: form
    });
    const d = await r.json();

    if (!r.ok) {
      setMessage(d.error || "Nie udało się dodać dokumentu.");
      setBusy(false);
      return;
    }

    setMessage("✓ Dokument został dodany.");
    setFile(null);
    setDocumentNumber("");
    setBusy(false);
    router.refresh();
  }

  async function remove(documentId: string) {
    if (!window.confirm("Usunąć ten dokument z rezerwacji?")) return;
    setBusy(true);

    const r = await fetch(
      `/api/admin/bookings/${bookingId}/documents/${documentId}`,
      { method: "DELETE" }
    );
    const d = await r.json();
    setMessage(r.ok ? "✓ Dokument usunięty." : d.error || "Błąd usuwania.");
    setBusy(false);
    if (r.ok) router.refresh();
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h2>Faktura / dokumenty</h2>
      <p className="muted">
        Dokumenty są prywatne. Firma otrzymuje dostęp tylko do dokumentów swoich rezerwacji.
      </p>

      {!documents?.length ? (
        <p className="muted">Brak dokumentów przypisanych do tej rezerwacji.</p>
      ) : (
        <div className="detail-list">
          {documents.map((doc: any) => (
            <div key={doc.id} style={{ alignItems: "center" }}>
              <span>
                {TYPE_LABELS[doc.document_type] || "Dokument"}
                {doc.document_number ? ` · ${doc.document_number}` : ""}
                <small style={{ display: "block" }}>{doc.original_name}</small>
              </span>
              <strong style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <a
                  className="btn secondary"
                  href={`/api/booking-documents/${doc.id}/download`}
                  target="_blank"
                  rel="noreferrer"
                >
                  OTWÓRZ
                </a>
                {canManage && (
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={busy}
                    onClick={() => remove(doc.id)}
                  >
                    USUŃ
                  </button>
                )}
              </strong>
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <div style={{ marginTop: 16, borderTop: "1px solid #343b49", paddingTop: 16 }}>
          <h3>Dodaj dokument</h3>
          <div className="grid">
            <label>
              Typ
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
                value={documentNumber}
                placeholder="np. FV/08/2026/123"
                onChange={(e) => setDocumentNumber(e.target.value)}
              />
            </label>
          </div>
          <label style={{ marginTop: 10 }}>
            PDF / JPG / PNG · max 10 MB
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <button className="btn" style={{ marginTop: 12 }} disabled={busy} onClick={upload}>
            {busy ? "WYSYŁANIE..." : "DODAJ DOKUMENT"}
          </button>
        </div>
      )}

      {message && <div className="admin-save-message">{message}</div>}
    </div>
  );
}
