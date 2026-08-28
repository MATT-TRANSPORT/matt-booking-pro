import { growthSourceLabel } from "@/lib/growthTracking";

export default function GrowthSourceCard({ booking }: { booking: any }) {
  const source = booking.acquisition_source || (String(booking.booking_source || "").startsWith("b2b") ? "b2b_portal" : "legacy");
  const hasTechnical = Boolean(
    booking.utm_source || booking.utm_medium || booking.utm_campaign || booking.utm_content ||
    booking.utm_term || booking.gclid || booking.fbclid || booking.referral_code || booking.landing_page
  );

  return (
    <div className="card growth-source-card" style={{ marginTop: 16 }}>
      <div className="company-section-head">
        <div>
          <span className="badge">GROWTH</span>
          <h2 style={{ marginBottom: 4 }}>Źródło rezerwacji</h2>
        </div>
        <strong>{growthSourceLabel(source)}</strong>
      </div>

      <div className="detail-list">
        <div><span>Kampania</span><strong>{booking.utm_campaign || "—"}</strong></div>
        <div><span>Partner / kod</span><strong>{booking.referral_code || "—"}</strong></div>
        <div><span>Strona wejścia</span><strong className="growth-wrap">{booking.landing_page || "—"}</strong></div>
      </div>

      {hasTechnical && (
        <details className="growth-tech-details">
          <summary>Dane techniczne kampanii</summary>
          <div className="detail-list" style={{ marginTop: 10 }}>
            <div><span>UTM source / medium</span><strong>{booking.utm_source || "—"} / {booking.utm_medium || "—"}</strong></div>
            <div><span>UTM content</span><strong>{booking.utm_content || "—"}</strong></div>
            <div><span>UTM term</span><strong>{booking.utm_term || "—"}</strong></div>
            <div><span>Google Click ID</span><strong className="growth-wrap">{booking.gclid || "—"}</strong></div>
            <div><span>Meta Click ID</span><strong className="growth-wrap">{booking.fbclid || "—"}</strong></div>
          </div>
        </details>
      )}
    </div>
  );
}
