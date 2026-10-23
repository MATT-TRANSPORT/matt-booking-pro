"use client";
import { useCustomerLocale } from "@/lib/useCustomerLocale";
import { companyText } from "@/lib/companyCopy";
import { withCustomerLocale } from "@/lib/bookingLocale";
const TYPE_LABELS: Record<string, string> = {
  invoice: "Faktura",
  correction: "Korekta",
  payment_confirmation: "Potwierdzenie płatności",
  other: "Inny dokument"
};

export default function CompanyBookingDocuments({
  bookingId,
  documents
}: {
  bookingId: string;
  documents: any[];
}) {
  const locale=useCustomerLocale();
  const t=(key:string)=>companyText(key,locale);
  const href=(path:string)=>withCustomerLocale(path,locale);
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h2>{t("Faktury / dokumenty")}</h2>
      {!documents?.length ? (
        <p className="muted">{t("Do tej rezerwacji nie dodano jeszcze dokumentu.")}</p>
      ) : (
        <div className="booking-document-list">
          {documents.map((doc: any) => (
            <div className="booking-document-row" key={doc.id}>
              <div>
                <strong>{t(TYPE_LABELS[doc.document_type] || doc.document_type)}</strong>
                <span>{doc.document_number || doc.file_name}</span>
                <small>{new Date(doc.created_at).toLocaleDateString(locale as string)}</small>
              </div>
              <a
                className="btn secondary company-small-btn"
                href={`/api/company/bookings/${bookingId}/documents/${doc.id}/download`}
                target="_blank"
                rel="noreferrer"
              >
                 {t("OTWÓRZ / POBIERZ")} </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
