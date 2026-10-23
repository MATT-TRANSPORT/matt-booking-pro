import { companyLanguage, type CompanySearchParams } from "@/lib/companyLanguage";
import CompanyNav from "@/components/CompanyNav";
import CompanyBookingForm from "@/components/CompanyBookingForm";
import { companyClient } from "@/lib/company";

export default async function Page({searchParams}:{searchParams:Promise<CompanySearchParams>}) {
  const {locale,t,href}=await companyLanguage(searchParams);
  const { s, company } = await companyClient(locale);
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: employees }, { data: terms }, { data: addresses }] = await Promise.all([
    s
      .from("company_employees")
      .select("*")
      .eq("company_id", company.id)
      .eq("active", true)
      .order("last_name")
      .order("first_name"),
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
      .select("id,label,address")
      .eq("company_id", company.id)
      .eq("active", true)
      .order("label")
  ]);

  return (
    <main className="container">
      <h1>{t("Nowa rezerwacja")}</h1>
      <CompanyNav customerLocale={locale} />
      <CompanyBookingForm
        employees={employees ?? []}
        companyName={company.name}
        commercialTerms={terms ?? null}
        addresses={addresses ?? []}
      />
    </main>
  );
}
