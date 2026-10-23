"use client";
import { customerFetch } from "@/lib/customerFetch";
import { useCustomerLocale } from "@/lib/useCustomerLocale";
import { companyText } from "@/lib/companyCopy";
import { withCustomerLocale } from "@/lib/bookingLocale";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TYPE_LABELS: Record<string, string> = {
  invoice: "Faktura",
  correction: "Korekta",
  payment_confirmation: "Potwierdzenie płatności",
  other: "Inny dokument"
};

export default function BookingDocumentsCard({
  customerLocale,
  bookingId,
  documents,
  canManage = false
}: {
  customerLocale?: unknown;
  bookingId: string;
  documents: any[];
  canManage?: boolean;
}) {
 const fetchCustomer=(input:RequestInfo|URL,init?:RequestInit)=>customerFetch(locale,input,init);
  const locale=useCustomerLocale(customerLocale);
  const t=(key:string)=>companyText(key,locale);
  const href=(path:string)=>withCustomerLocale(path,locale);
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("invoice");
  const [documentNumber, setDocumentNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function upload() {
    if (!file) {
      setMessage(t("Wybierz plik PDF, JPG lub PNG."));
      return;
    }

    setBusy(true);
    setMessage(t("Wysyłanie dokumentu..."));

    const form = new FormData();
    form.append("file", file);
    form.append("documentType", documentType);
    form.append("documentNumber", documentNumber);

    const r = await fetchCustomer(`/api/admin/bookings/${bookingId}/documents`, {
      method: "POST",
      body: form
    });
    const d = await r.json();

    if (!r.ok) {
      setMessage(d.error || t("Nie udało się dodać dokumentu."));
      setBusy(false);
      return;
    }

    setMessage(t("✓ Dokument został dodany."));
    setFile(null);
    setDocumentNumber("");
    setBusy(false);
    router.refresh();
  }

  async function remove(documentId: string) {
    if (!window.confirm(t("Usunąć ten dokument z rezerwacji?"))) return;
    setBusy(true);

    const r = await fetchCustomer(
      `/api/admin/bookings/${bookingId}/documents/${documentId}`,
      { method: "DELETE" }
    );
    const d = await r.json();
    setMessage(r.ok ? t("✓ Dokument usunięty.") : d.error || t("Błąd usuwania."));
    setBusy(false);
    if (r.ok) router.refresh();
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h2>{t("Faktura / dokumenty")}</h2>
      <p className="muted">
         {t("Dokumenty są prywatne. Firma otrzymuje dostęp tylko do dokumentów swoich rezerwacji.")} </p>

      {!documents?.length ? (
        <p className="muted">{t("Brak dokumentów przypisanych do tej rezerwacji.")}</p>
      ) : (
        <div className="detail-list">
          {documents.map((doc: any) => (
            <div key={doc.id} style={{ alignItems: "center" }}>
              <span>
                {TYPE_LABELS[doc.document_type] || t("Dokument")}
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
                   {t("OTWÓRZ")} </a>
                {canManage && (
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={busy}
                    onClick={() => remove(doc.id)}
                  >
                     {t("USUŃ")} </button>
                )}
              </strong>
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <div style={{ marginTop: 16, borderTop: "1px solid #343b49", paddingTop: 16 }}>
          <h3>{t("Dodaj dokument")}</h3>
          <div className="grid">
            <label>
               {t("Typ")} <select value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
                <option value="invoice">{t("Faktura")}</option>
                <option value="correction">{t("Korekta")}</option>
                <option value="payment_confirmation">{t("Potwierdzenie płatności")}</option>
                <option value="other">{t("Inny dokument")}</option>
              </select>
            </label>
            <label>
               {t("Numer dokumentu")} <input
                value={documentNumber}
                placeholder="np. FV/08/2026/123"
                onChange={(e) => setDocumentNumber(e.target.value)}
              />
            </label>
          </div>
          <label style={{ marginTop: 10 }}>
             {t("PDF / JPG / PNG · max 10 MB")} <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <button className="btn" style={{ marginTop: 12 }} disabled={busy} onClick={upload}>
            {busy ? t("WYSYŁANIE...") : "DODAJ DOKUMENT"}
          </button>
        </div>
      )}

      {message && <div className="admin-save-message">{message}</div>}
    </div>
  );
}
