import PortalAccessButton from "@/components/PortalAccessButton";
import CompanyTermsEditor from "@/components/CompanyTermsEditor";
import { notFound } from "next/navigation";
import PanelNav from "@/components/PanelNav";
import SettlementUpload from "@/components/SettlementUpload";
import { panelClient } from "@/lib/panel";

export default async function Page({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { s } = await panelClient();

  const [
    { data: company },
    { data: employees },
    { data: bookings },
    { data: users },
    { data: settlements },
    { data: termsHistory }
  ] = await Promise.all([
    s.from("companies").select("*").eq("id", id).single(),
    s.from("company_employees").select("*").eq("company_id", id).order("last_name"),
    s.from("bookings").select("*").eq("company_id", id).order("created_at", { ascending: false }).limit(200),
    s.from("company_users").select("id,user_id,role,active").eq("company_id", id),
    s.from("company_settlements").select("*").eq("company_id", id).order("period_month", { ascending: false }),
    s.from("company_commercial_terms")
      .select("*")
      .eq("company_id", id)
      .eq("active", true)
      .order("effective_from", { ascending: false })
      .order("created_at", { ascending: false })
  ]);

  if (!company) notFound();

  const today = new Date().toISOString().slice(0, 10);
  const currentTerms =
    (termsHistory ?? []).find((x: any) => String(x.effective_from) <= today) ??
    (termsHistory ?? [])[0] ??
    null;

  const { data: currentPrices } = currentTerms
    ? await s
        .from("company_commercial_prices")
        .select("*")
        .eq("terms_id", currentTerms.id)
        .order("airport_key")
    : { data: [] as any[] };

  const grossTotal = (bookings ?? []).reduce(
    (sum: number, booking: any) =>
      sum + Number(booking.b2b_gross ?? booking.total_price ?? 0),
    0
  );

  const netTotal = (bookings ?? []).reduce(
    (sum: number, booking: any) =>
      sum + Number(
        booking.b2b_net ?? booking.total_price ?? 0
      ),
    0
  );

  return (
    <main className="container">
      <a className="back-link" href="/panel/firmy">← Firmy B2B</a>
      <h1>{company.name}</h1>
      <PanelNav />

      <div className="stats">
        <div className="stat"><strong>{employees?.length ?? 0}</strong><span>Pracownicy</span></div>
        <div className="stat"><strong>{bookings?.length ?? 0}</strong><span>Rezerwacje</span></div>
        <div className="stat"><strong>{netTotal.toFixed(0)} zł</strong><span>Wartość netto</span></div>
        <div className="stat"><strong>{grossTotal.toFixed(0)} zł</strong><span>Wartość brutto</span></div>
      </div>

      <div className="reservation-detail-grid">
        <CompanyTermsEditor
          company={company}
          currentTerms={currentTerms}
          currentPrices={currentPrices ?? []}
          history={termsHistory ?? []}
        />

        <div>
          <div className="card">
            <h2>Dane firmy</h2>
            <div className="detail-list">
              <div><span>NIP</span><strong>{company.nip || "—"}</strong></div>
              <div><span>E-mail</span><strong>{company.email || "—"}</strong></div>
              <div><span>Telefon</span><strong>{company.phone || "—"}</strong></div>
              <div><span>Kontakt</span><strong>{company.contact_person || "—"}</strong></div>
              <div><span>Siedziba do wyceny</span><strong>{currentTerms?.headquarters_address || "DO UZUPEŁNIENIA"}</strong></div>
              <div><span>Limit bez dopłaty</span><strong>{currentTerms ? `${Number(currentTerms.free_km).toFixed(1)} km` : "—"}</strong></div>
              <div><span>Stawka ponad limit</span><strong>{currentTerms ? `${Number(currentTerms.extra_km_rate_net).toFixed(2)} zł netto/km` : "—"}</strong></div>
              <div><span>VAT</span><strong>{currentTerms ? `${Number(currentTerms.vat_rate).toFixed(0)}%` : "8%"}</strong></div>
              <div><span>Dostęp B2B</span><strong>{(users?.length ?? 0) > 0 ? "Konto aktywne" : "Brak konta"}</strong></div>
            </div>
            <PortalAccessButton
              type="company"
              id={company.id}
              active={(users?.length ?? 0) > 0}
            />
          </div>

          <SettlementUpload companyId={company.id} />
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h2>Rozliczenia</h2>
        <table className="table">
          <thead>
            <tr><th>Miesiąc</th><th>Kwota</th><th>Faktura</th><th>Status</th></tr>
          </thead>
          <tbody>
            {(settlements ?? []).map((item: any) => (
              <tr key={item.id}>
                <td>{String(item.period_month).slice(0, 7)}</td>
                <td>{Number(item.amount).toFixed(2)} zł</td>
                <td>{item.invoice_number || "—"}</td>
                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h2>Ostatnie rezerwacje</h2>
        <table className="table">
          <thead>
            <tr><th>Typ</th><th>Numer</th><th>Pasażer</th><th>Termin</th><th>Netto</th><th>Brutto</th><th>Status</th></tr>
          </thead>
          <tbody>
            {(bookings ?? []).slice(0, 50).map((booking: any) => (
              <tr key={booking.id}>
                <td><span className="origin-badge b2b">🏢 B2B</span></td>
                <td><a href={`/panel/rezerwacje/${booking.id}`}>{booking.booking_number}</a></td>
                <td>{booking.customer_name}</td>
                <td>{booking.travel_date} {booking.travel_time}</td>
                <td>{Number(booking.b2b_net ?? booking.total_price).toFixed(2)} zł</td>
                <td>{Number(booking.b2b_gross ?? booking.total_price).toFixed(2)} zł</td>
                <td>{booking.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
