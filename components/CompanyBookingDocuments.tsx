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
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h2>Faktury / dokumenty</h2>
      {!documents?.length ? (
        <p className="muted">Do tej rezerwacji nie dodano jeszcze dokumentu.</p>
      ) : (
        <div className="booking-document-list">
          {documents.map((doc: any) => (
            <div className="booking-document-row" key={doc.id}>
              <div>
                <strong>{TYPE_LABELS[doc.document_type] || doc.document_type}</strong>
                <span>{doc.document_number || doc.file_name}</span>
                <small>{new Date(doc.created_at).toLocaleDateString("pl-PL")}</small>
              </div>
              <a
                className="btn secondary company-small-btn"
                href={`/api/company/bookings/${bookingId}/documents/${doc.id}/download`}
                target="_blank"
                rel="noreferrer"
              >
                OTWÓRZ / POBIERZ
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
