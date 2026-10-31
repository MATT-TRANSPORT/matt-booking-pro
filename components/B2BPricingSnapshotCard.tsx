import { companyText } from "@/lib/companyCopy";
import { withCustomerLocale } from "@/lib/bookingLocale";
import { companyBookingMoney } from "@/lib/companyPortal";

function finite(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export default function B2BPricingSnapshotCard({customerLocale,  booking }: {customerLocale?:unknown;  booking: any }) {
 const locale=customerLocale??"pl";
 const t=(key:string)=>companyText(key,locale);
 const href=(path:string)=>withCustomerLocale(path,locale);
  if (!booking.company_id) return null;
  const { net, vatRate, vat, gross } = companyBookingMoney(booking);
  const snapshot: any = booking.pricing_snapshot || {};
  const distance = finite(booking.pricing_distance_km ?? snapshot.distance_km ?? booking.distance_km, 0);
  const freeKm = finite(booking.pricing_free_km ?? snapshot.free_km, 0);
  const billable = finite(booking.pricing_billable_km ?? snapshot.billable_km, Math.max(0, distance - freeKm));
  const rate = finite(booking.pricing_extra_km_rate_net ?? snapshot.extra_km_rate_net, 0);
  const base = finite(snapshot.base_price_net ?? booking.base_price, 0);
  const extra = finite(snapshot.extra_price_net ?? booking.extra_price, 0);
  const source = booking.pricing_source === "custom" ? t("Indywidualny") : booking.pricing_source === "legacy_b2b" ? t("Historyczny") : t("Standardowy MATT / fallback");

  return <div className="card" style={{ marginTop: 16 }}>
    <span className="badge">B2B PRO · {t("SNAPSHOT CENY")}</span>
    <h2>{t("Wycena B2B")}</h2>
    <div className="detail-list">
      <div><span>{t("Cennik")}</span><strong>{source}</strong></div>
      <div><span>{t("Warunki ważne od")}</span><strong>{snapshot.effective_from || "—"}</strong></div>
      <div><span>{t("Siedziba kontrahenta")}</span><strong>{booking.pricing_origin_address || snapshot.origin_address || "—"}</strong></div>
      {snapshot.version===2 ? <><div><span>{t("Trasa bazowa")}</span><strong>{finite(snapshot.route_baseline_km).toFixed(1)} km</strong></div><div><span>{t("Trasa z adresami")}</span><strong>{finite(snapshot.route_actual_km).toFixed(1)} km</strong></div></> : <><div><span>{t("Odległość od siedziby")}</span><strong>{distance.toFixed(1)} km</strong></div>
      <div><span>{t("Limit bez dopłaty")}</span><strong>{freeKm.toFixed(1)} km</strong></div></>}
      <div><span>{t("Kilometry płatne")}</span><strong>{billable.toFixed(1)} km</strong></div>
      <div><span>{t("Stawka powyżej limitu")}</span><strong>{rate.toFixed(2)}  {t("zł netto/km")}</strong></div>
      <div><span>{t("Cena bazowa")}</span><strong>{base.toFixed(2)}  {t("zł netto")}</strong></div>
      <div><span>{t("Dopłata za km")}</span><strong>{extra.toFixed(2)}  {t("zł netto")}</strong></div>
      <div className="detail-total"><span>{t("Razem NETTO")}</span><strong>{net.toFixed(2)} zł</strong></div>
      <div><span>{t("VAT")} {vatRate.toFixed(0)}%</span><strong>{vat.toFixed(2)} zł</strong></div>
      <div className="detail-total"><span>{t("Razem BRUTTO")}</span><strong>{gross.toFixed(2)} zł</strong></div>
    </div>
    <p className="muted" style={{ marginTop: 12 }}>{t("Cena została zapisana wraz z warunkami użytymi w chwili wyceny. Późniejsza zmiana cennika firmy nie zmienia tej rezerwacji.")}</p>
  </div>;
}
