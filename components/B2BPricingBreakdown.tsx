import { companyText } from "@/lib/companyCopy";
import { withCustomerLocale } from "@/lib/bookingLocale";
export default function B2BPricingBreakdown({customerLocale,
  booking,
  compact = false
}: {customerLocale?:unknown;
  booking: any;
  compact?: boolean;
}) {
 const locale=customerLocale??"pl";
 const t=(key:string)=>companyText(key,locale);
 const href=(path:string)=>withCustomerLocale(path,locale);
  if (!booking?.company_id) return null;

  const hasSnapshot = booking.b2b_net !== null && booking.b2b_net !== undefined;

  if (!hasSnapshot) {
    return (
      <div className="card b2b-price-card">
        <span className="badge">B2B · LEGACY</span>
        <h2>{t("Wycena historyczna")}</h2>
        <p className="muted">
           {t("Ta rezerwacja powstała przed wdrożeniem B2B PRO i nie ma zapisanego snapshotu NETTO/VAT/BRUTTO. Pokazujemy dokładnie kwotę zapisaną w starej wersji systemu — bez sztucznego przeliczania historii.")} </p>
        <div className="detail-list">
          <div className="detail-total"><span>{t("Kwota historyczna")}</span><strong>{Number(booking.total_price ?? 0).toFixed(2)} zł</strong></div>
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
        <strong>{net.toFixed(2)}  {t("zł netto")}</strong>
        <span>{t("+ VAT")} {vatRate.toFixed(0)}% = {gross.toFixed(2)}  {t("zł brutto")}</span>
      </div>
    );
  }

  return (
    <div className="card b2b-price-card">
      <div className="company-section-head">
        <div>
          <span className="badge">B2B PRO</span>
          <h2>{t("Wycena B2B")}</h2>
        </div>
        <span className="b2b-snapshot-badge">{t("🔒 SNAPSHOT CENY")}</span>
      </div>

      <div className="detail-list">
        <div><span>{t("Cennik")}</span><strong>{booking.b2b_pricing_mode === "custom" ? t("Indywidualny") : t("Standardowy MATT")}</strong></div>
        <div><span>{t("Warunki ważne od")}</span><strong>{booking.b2b_terms_effective_from || "—"}</strong></div>
        <div><span>{t("Siedziba kontrahenta")}</span><strong>{booking.b2b_headquarters_address || "—"}</strong></div>
        <div><span>{t("Odległość od siedziby")}</span><strong>{Number(booking.b2b_distance_from_headquarters_km ?? booking.distance_km ?? 0).toFixed(1)} km</strong></div>
        <div><span>{t("Limit bez dopłaty")}</span><strong>{Number(booking.b2b_free_km ?? 0).toFixed(1)} km</strong></div>
        <div><span>{t("Km płatne")}</span><strong>{Number(booking.b2b_billable_km ?? 0).toFixed(1)} km</strong></div>
        <div><span>{t("Stawka ponad limit")}</span><strong>{Number(booking.b2b_extra_km_rate_net ?? 0).toFixed(2)}  {t("zł netto/km")}</strong></div>
        <div><span>{t("Cena bazowa")}</span><strong>{Number(booking.b2b_base_net ?? booking.base_price ?? 0).toFixed(2)}  {t("zł netto")}</strong></div>
        <div><span>{t("Dopłata za km")}</span><strong>{Number(booking.b2b_extra_net ?? booking.extra_price ?? 0).toFixed(2)}  {t("zł netto")}</strong></div>
        {Number(booking.b2b_discount_net ?? 0) > 0 && (
          <div><span>{t("Rabat")} {Number(booking.b2b_discount_percent ?? 0).toFixed(1)}%</span><strong>-{Number(booking.b2b_discount_net).toFixed(2)}  {t("zł netto")}</strong></div>
        )}
        <div><span>{t("Razem netto")}</span><strong>{net.toFixed(2)} zł</strong></div>
        <div><span>VAT {vatRate.toFixed(0)}%</span><strong>{vat.toFixed(2)} zł</strong></div>
        <div className="detail-total"><span>{t("Razem brutto")}</span><strong>{gross.toFixed(2)} zł</strong></div>
      </div>

      <p className="muted" style={{ marginTop: 10 }}>
         {t("Wszystkie podane ceny B2B są cenami netto. Do kwoty doliczany jest VAT")} {vatRate.toFixed(0)}%.
      </p>
    </div>
  );
}
