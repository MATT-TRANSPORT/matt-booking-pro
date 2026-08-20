export default function B2BPricingBreakdown({
  booking,
  compact = false
}: {
  booking: any;
  compact?: boolean;
}) {
  if (!booking?.company_id) return null;

  const hasSnapshot = booking.b2b_net !== null && booking.b2b_net !== undefined;

  if (!hasSnapshot) {
    return (
      <div className="card b2b-price-card">
        <span className="badge">B2B · LEGACY</span>
        <h2>Wycena historyczna</h2>
        <p className="muted">
          Ta rezerwacja powstała przed wdrożeniem B2B PRO i nie ma zapisanego snapshotu NETTO/VAT/BRUTTO. Pokazujemy dokładnie kwotę zapisaną w starej wersji systemu — bez sztucznego przeliczania historii.
        </p>
        <div className="detail-list">
          <div className="detail-total"><span>Kwota historyczna</span><strong>{Number(booking.total_price ?? 0).toFixed(2)} zł</strong></div>
        </div>
      </div>
    );
  }

  const net = Number(booking.b2b_net);
  const vatRate = Number(booking.b2b_vat_rate ?? 8);
  const vat = Number(
    booking.b2b_vat ??
      booking.vat_price ??
      net * (vatRate / 100)
  );
  const gross = Number(booking.b2b_gross ?? booking.total_price ?? net + vat);

  if (compact) {
    return (
      <div className="b2b-price-compact">
        <strong>{net.toFixed(2)} zł netto</strong>
        <span>+ VAT {vatRate.toFixed(0)}% = {gross.toFixed(2)} zł brutto</span>
      </div>
    );
  }

  return (
    <div className="card b2b-price-card">
      <div className="company-section-head">
        <div>
          <span className="badge">B2B PRO</span>
          <h2>Wycena B2B</h2>
        </div>
        <span className="b2b-snapshot-badge">🔒 SNAPSHOT CENY</span>
      </div>

      <div className="detail-list">
        <div><span>Cennik</span><strong>{booking.b2b_pricing_mode === "custom" ? "Indywidualny" : "Standardowy MATT"}</strong></div>
        <div><span>Warunki ważne od</span><strong>{booking.b2b_terms_effective_from || "—"}</strong></div>
        <div><span>Siedziba kontrahenta</span><strong>{booking.b2b_headquarters_address || "—"}</strong></div>
        <div><span>Odległość od siedziby</span><strong>{Number(booking.b2b_distance_from_headquarters_km ?? booking.distance_km ?? 0).toFixed(1)} km</strong></div>
        <div><span>Limit bez dopłaty</span><strong>{Number(booking.b2b_free_km ?? 0).toFixed(1)} km</strong></div>
        <div><span>Km płatne</span><strong>{Number(booking.b2b_billable_km ?? 0).toFixed(1)} km</strong></div>
        <div><span>Stawka ponad limit</span><strong>{Number(booking.b2b_extra_km_rate_net ?? 0).toFixed(2)} zł netto/km</strong></div>
        <div><span>Cena bazowa</span><strong>{Number(booking.b2b_base_net ?? booking.base_price ?? 0).toFixed(2)} zł netto</strong></div>
        <div><span>Dopłata za km</span><strong>{Number(booking.b2b_extra_net ?? booking.extra_price ?? 0).toFixed(2)} zł netto</strong></div>
        {Number(booking.b2b_discount_net ?? 0) > 0 && (
          <div><span>Rabat {Number(booking.b2b_discount_percent ?? 0).toFixed(1)}%</span><strong>-{Number(booking.b2b_discount_net).toFixed(2)} zł netto</strong></div>
        )}
        <div><span>Razem netto</span><strong>{net.toFixed(2)} zł</strong></div>
        <div><span>VAT {vatRate.toFixed(0)}%</span><strong>{vat.toFixed(2)} zł</strong></div>
        <div className="detail-total"><span>Razem brutto</span><strong>{gross.toFixed(2)} zł</strong></div>
      </div>

      <p className="muted" style={{ marginTop: 10 }}>
        Wszystkie podane ceny B2B są cenami netto. Do kwoty doliczany jest VAT {vatRate.toFixed(0)}%.
      </p>
    </div>
  );
}
