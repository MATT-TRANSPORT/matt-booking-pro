import { companyLanguage, type CompanySearchParams } from "@/lib/companyLanguage";
import CompanyNav from "@/components/CompanyNav";
import CompanyBookingTemplates from "@/components/CompanyBookingTemplates";
import { companyClient } from "@/lib/company";
import { createAdminClient } from "@/lib/supabase/admin";
import { airportPriceMap, getAirportCatalog } from "@/lib/airportPricingServer";

export default async function CompanyTemplatesPage({searchParams}:{searchParams:Promise<CompanySearchParams>}) {
  const {locale,t,href}=await companyLanguage(searchParams);
  const { company } = await companyClient(locale);
  const admin = createAdminClient();
  const [{ data: templates }, { data: employees }, { data: bookings }, airportRows] = await Promise.all([
    admin.from("company_booking_templates").select("*").eq("company_id", company.id).eq("active", true).order("name"),
    admin.from("company_employees").select("id,first_name,last_name,phone,email,active").eq("company_id", company.id).eq("active", true).order("last_name"),
    admin.from("bookings").select("id,booking_number,customer_name,airport_label,travel_date").eq("company_id", company.id).order("created_at", { ascending: false }).limit(60),
    getAirportCatalog(admin)
  ]);

  const airports = Object.fromEntries(
    Object.entries(airportPriceMap(airportRows)).map(([key, value]) => [key, { label: value.label }])
  );

  return <main className="container">
    <span className="badge">MATT BOOKING PRO · B2B PRO</span>
    <h1>{t("Szablony i rezerwacje cykliczne")}</h1>
    <CompanyNav customerLocale={locale} />
    <CompanyBookingTemplates
      templates={templates ?? []}
      employees={employees ?? []}
      recentBookings={bookings ?? []}
      airports={airports}
    />
  </main>;
}
