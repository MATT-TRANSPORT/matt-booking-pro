import { companyText } from "@/lib/companyCopy";
import { withCustomerLocale } from "@/lib/bookingLocale";
export default function CompanyTermsSummaryCard({customerLocale,
  companyName,
  terms,
  nextTerms,
  compact = false
}: {customerLocale?:unknown;
  companyName?: string;
  terms: any;
  nextTerms?: any | null;
  compact?: boolean;
}) {
 const locale=customerLocale??"pl";
 const t=(key:string)=>companyText(key,locale);
 const href=(path:string)=>withCustomerLocale(path,locale);
  if (!terms) {
    return (
      <div className="card b2b-terms-card">
        <span className="badge">B2B PRO</span>
        <h2>{t("Warunki handlowe")}</h2>
        <p className="muted">
           {t("Brak aktywnych warunków handlowych. Skontaktuj się z MATT TRANSPORT.")} </p>
      </div>
    );
  }

  return (
    <div className="card b2b-terms-card">
      <div className="b2b-terms-head">
        <div>
          <span className="badge">{t("B2B PRO · TWOJE WARUNKI")}</span>
          <h2>{companyName ? `${t("Warunki")} ${companyName}` : t("Warunki handlowe")}</h2>
        </div>
        <a className="btn secondary company-small-btn" href={href("/firma/cennik")}>
           {t("PEŁNY CENNIK")} </a>
      </div>

      <div className={compact ? "b2b-terms-grid compact" : "b2b-terms-grid"}>
        <div>
          <span>{t("Siedziba do kalkulacji")}</span>
          <strong>{terms.pricing_origin_address || "—"}</strong>
        </div>
        <div>
          <span>{t("Limit bez dopłaty")}</span>
          <strong>{Number(terms.free_km ?? 0).toFixed(1)} km</strong>
        </div>
        <div>
          <span>{t("Powyżej limitu")}</span>
          <strong>{Number(terms.extra_km_rate_net ?? 0).toFixed(2)}  {t("zł netto/km")}</strong>
        </div>
        <div>
          <span>{t("Cennik")}</span>
          <strong>{terms.use_custom_pricing ? t("Indywidualny") : t("Standardowy MATT")}</strong>
        </div>
        <div>
          <span>{t("Ważne od")}</span>
          <strong>{terms.effective_from || "—"}</strong>
        </div>
        <div>
          <span>{t("Termin płatności")}</span>
          <strong>{Number(terms.payment_days ?? 14)}  {t("dni")}</strong>
        </div>
      </div>

      {terms.commercial_notes && !compact && (
        <div className="b2b-commercial-note">
          <strong>{t("Warunki dodatkowe")}</strong>
          <span>{terms.commercial_notes}</span>
        </div>
      )}

      {nextTerms && (
        <div className="b2b-upcoming-terms">
           {t("Nowa wersja warunków zacznie obowiązywać od")} <strong>{nextTerms.effective_from}</strong>.
        </div>
      )}

      <p className="muted b2b-net-note">
         {t("Wszystkie ceny B2B są cenami NETTO. Do kwoty doliczany jest VAT 8%.")} </p>
    </div>
  );
}
