import { companyLanguage, type CompanySearchParams } from "@/lib/companyLanguage";
import CompanyNav from "@/components/CompanyNav";
import CompanyTermsSummaryCard from "@/components/CompanyTermsSummaryCard";
import CompanyAddressesManager from "@/components/CompanyAddressesManager";
import { companyClient } from "@/lib/company";

export default async function Page({searchParams}:{searchParams:Promise<CompanySearchParams>}) {
  const {locale,t,href}=await companyLanguage(searchParams);
  const { s, company, membership } = await companyClient(locale);
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
      <h1>{t("Dane firmy")}</h1>
      <CompanyNav customerLocale={locale} />
      <div className="reservation-detail-grid">
        <div className="card">
          <h2>{t("Dane kontrahenta")}</h2>
          <div className="detail-list">
            <div><span>{t("Nazwa")}</span><strong>{company.name}</strong></div>
            <div><span>NIP</span><strong>{company.nip || "—"}</strong></div>
            <div><span>{t("E-mail")}</span><strong>{company.email || "—"}</strong></div>
            <div><span>{t("Telefon")}</span><strong>{company.phone || "—"}</strong></div>
            <div><span>{t("Kontakt")}</span><strong>{company.contact_person || "—"}</strong></div>
            <div><span>{t("Twoja rola")}</span><strong>{membership.role}</strong></div>
          </div>
        </div>

        <CompanyTermsSummaryCard customerLocale={locale} companyName={company.name} terms={terms} />
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
