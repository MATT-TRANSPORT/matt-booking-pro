import {
  companyBookingMoney,
  finiteMoney
} from "@/lib/companyPortal";

function oneDecimal(value: unknown) {
  return finiteMoney(value).toFixed(1);
}

function twoDecimals(value: unknown) {
  return finiteMoney(value).toFixed(2);
}

export default function B2BPricingSnapshotCard({
  booking
}: {
  booking: any;
}) {
  if (!booking?.company_id) return null;

  const money = companyBookingMoney(booking);
  const snapshot: any =
    booking?.pricing_snapshot &&
    typeof booking.pricing_snapshot === "object"
      ? booking.pricing_snapshot
      : {};

  const distance =
    booking?.pricing_distance_km ??
    snapshot?.distance_km ??
    booking?.distance_km ??
    0;

  const freeKm =
    booking?.pricing_free_km ??
    snapshot?.free_km ??
    0;

  const billable =
    booking?.pricing_billable_km ??
    snapshot?.billable_km ??
    Math.max(
      0,
      finiteMoney(distance) - finiteMoney(freeKm)
    );

  const rate =
    booking?.pricing_extra_km_rate_net ??
    snapshot?.extra_km_rate_net ??
    0;

  const base =
    snapshot?.base_price_net ??
    booking?.base_price ??
    0;

  const extra =
    snapshot?.extra_price_net ??
    booking?.extra_price ??
    0;

  const pricingSource =
    booking?.pricing_source ||
    snapshot?.pricing_source ||
    (snapshot?.version ? "standard" : "legacy_b2b");

  const pricingLabel =
    pricingSource === "custom"
      ? "Indywidualny"
      : pricingSource === "legacy_b2b" ||
        money.source === "legacy_net" ||
        money.source === "components" ||
        money.source === "gross_total"
      ? "Historyczny / przed pełnym B2B PRO"
      : "Standardowy MATT / fallback";

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <span className="badge">
        B2B PRO · WYCENA REZERWACJI
      </span>
      <h2>Wycena B2B</h2>

      <div className="detail-list">
        <div>
          <span>Cennik</span>
          <strong>{pricingLabel}</strong>
        </div>

        <div>
          <span>Warunki ważne od</span>
          <strong>
            {snapshot?.effective_from || "—"}
          </strong>
        </div>

        <div>
          <span>Siedziba kontrahenta</span>
          <strong>
            {booking?.pricing_origin_address ||
              snapshot?.origin_address ||
              "—"}
          </strong>
        </div>

        <div>
          <span>Odległość od siedziby</span>
          <strong>{oneDecimal(distance)} km</strong>
        </div>

        <div>
          <span>Limit bez dopłaty</span>
          <strong>{oneDecimal(freeKm)} km</strong>
        </div>

        <div>
          <span>Kilometry płatne</span>
          <strong>{oneDecimal(billable)} km</strong>
        </div>

        <div>
          <span>Stawka powyżej limitu</span>
          <strong>{twoDecimals(rate)} zł netto/km</strong>
        </div>

        <div>
          <span>Cena bazowa</span>
          <strong>{twoDecimals(base)} zł netto</strong>
        </div>

        <div>
          <span>Dopłata za km</span>
          <strong>{twoDecimals(extra)} zł netto</strong>
        </div>

        <div className="detail-total">
          <span>Razem NETTO</span>
          <strong>{money.net.toFixed(2)} zł</strong>
        </div>

        <div>
          <span>VAT {money.vatRate.toFixed(0)}%</span>
          <strong>{money.vat.toFixed(2)} zł</strong>
        </div>

        <div className="detail-total">
          <span>Razem BRUTTO</span>
          <strong>{money.gross.toFixed(2)} zł</strong>
        </div>
      </div>

      {snapshot?.version ? (
        <p className="muted" style={{ marginTop: 12 }}>
          Cena została zapisana wraz z warunkami użytymi
          w chwili wyceny. Późniejsza zmiana cennika firmy
          nie zmienia tej rezerwacji.
        </p>
      ) : (
        <p className="muted" style={{ marginTop: 12 }}>
          Rezerwacja pochodzi z wcześniejszej wersji systemu.
          Kwoty są prezentowane według historycznych składowych
          zapisanych przy rezerwacji. Nowe kursy korzystają już
          z pełnego snapshotu B2B PRO.
        </p>
      )}
    </div>
  );
}
