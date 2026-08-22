import CompanyNav from "@/components/CompanyNav";
import CompanyTermsSummaryCard from "@/components/CompanyTermsSummaryCard";
import CompanyAddressesManager from "@/components/CompanyAddressesManager";
import { companyClient } from "@/lib/company";

export default async function Page() {
  const { s, company, membership } = await companyClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: terms }, { data: addresses }] = await Promise.all([
    s
    .from("company_pricing_terms")
    .select("*")
    .eq("company_id", company.id)
    .eq("active", true)
    .lte("effective_from", today)
    .order("effective_from", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle(),
    s
      .from("company_addresses")
      .select("id,label,address,active,created_at")
      .eq("company_id", company.id)
      .eq("active", true)
      .order("label")
  ]);

  return (
    <main className="container">
      <h1>Dane firmy</h1>
      <CompanyNav />
      <div className="reservation-detail-grid">
        <div className="card">
          <h2>Dane kontrahenta</h2>
          <div className="detail-list">
            <div><span>Nazwa</span><strong>{company.name}</strong></div>
            <div><span>NIP</span><strong>{company.nip || "—"}</strong></div>
            <div><span>E-mail</span><strong>{company.email || "—"}</strong></div>
            <div><span>Telefon</span><strong>{company.phone || "—"}</strong></div>
            <div><span>Kontakt</span><strong>{company.contact_person || "—"}</strong></div>
            <div><span>Twoja rola</span><strong>{membership.role}</strong></div>
          </div>
        </div>

        <CompanyTermsSummaryCard companyName={company.name} terms={terms} />
      </div>

      <div style={{ marginTop: 18 }}>
        <CompanyAddressesManager
          addresses={addresses ?? []}
          canManage={["admin", "manager"].includes(membership.role)}
        />
      </div>
    </main>
  );
}
