export default function CompanyTermsSummaryCard({
  companyName,
  terms,
  nextTerms,
  compact = false
}: {
  companyName?: string;
  terms: any;
  nextTerms?: any | null;
  compact?: boolean;
}) {
  if (!terms) {
    return (
      <div className="card b2b-terms-card">
        <span className="badge">B2B PRO</span>
        <h2>Warunki handlowe</h2>
        <p className="muted">
          Brak aktywnych warunków handlowych. Skontaktuj się z MATT TRANSPORT.
        </p>
      </div>
    );
  }

  return (
    <div className="card b2b-terms-card">
      <div className="b2b-terms-head">
        <div>
          <span className="badge">B2B PRO · TWOJE WARUNKI</span>
          <h2>{companyName ? `Warunki ${companyName}` : "Warunki handlowe"}</h2>
        </div>
        <a className="btn secondary company-small-btn" href="/firma/cennik">
          PEŁNY CENNIK
        </a>
      </div>

      <div className={compact ? "b2b-terms-grid compact" : "b2b-terms-grid"}>
        <div>
          <span>Siedziba do kalkulacji</span>
          <strong>{terms.pricing_origin_address || "—"}</strong>
        </div>
        <div>
          <span>Limit bez dopłaty</span>
          <strong>{Number(terms.free_km ?? 0).toFixed(1)} km</strong>
        </div>
        <div>
          <span>Powyżej limitu</span>
          <strong>{Number(terms.extra_km_rate_net ?? 0).toFixed(2)} zł netto/km</strong>
        </div>
        <div>
          <span>Cennik</span>
          <strong>{terms.use_custom_pricing ? "Indywidualny" : "Standardowy MATT"}</strong>
        </div>
        <div>
          <span>Ważne od</span>
          <strong>{terms.effective_from || "—"}</strong>
        </div>
        <div>
          <span>Termin płatności</span>
          <strong>{Number(terms.payment_days ?? 14)} dni</strong>
        </div>
      </div>

      {terms.commercial_notes && !compact && (
        <div className="b2b-commercial-note">
          <strong>Warunki dodatkowe</strong>
          <span>{terms.commercial_notes}</span>
        </div>
      )}

      {nextTerms && (
        <div className="b2b-upcoming-terms">
          Nowa wersja warunków zacznie obowiązywać od <strong>{nextTerms.effective_from}</strong>.
        </div>
      )}

      <p className="muted b2b-net-note">
        Wszystkie ceny B2B są cenami NETTO. Do kwoty doliczany jest VAT 8%.
      </p>
    </div>
  );
}
