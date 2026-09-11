import CompanyNav from "@/components/CompanyNav";
import CompanyBookingTemplates from "@/components/CompanyBookingTemplates";
import { companyClient } from "@/lib/company";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRICES } from "@/lib/pricing";

export default async function CompanyTemplatesPage() {
  const { company } = await companyClient();
  const admin = createAdminClient();
  const [{ data: templates }, { data: employees }, { data: bookings }] = await Promise.all([
    admin.from("company_booking_templates").select("*").eq("company_id", company.id).eq("active", true).order("name"),
    admin.from("company_employees").select("id,first_name,last_name,phone,email,active").eq("company_id", company.id).eq("active", true).order("last_name"),
    admin.from("bookings").select("id,booking_number,customer_name,airport_label,travel_date").eq("company_id", company.id).order("created_at", { ascending: false }).limit(60)
  ]);

  const airports = Object.fromEntries(Object.entries(PRICES).map(([key, value]) => [key, { label: value.label }]));

  return <main className="container">
    <span className="badge">MATT BOOKING PRO · B2B PRO</span>
    <h1>Szablony i rezerwacje cykliczne</h1>
    <CompanyNav />
    <CompanyBookingTemplates
      templates={templates ?? []}
      employees={employees ?? []}
      recentBookings={bookings ?? []}
      airports={airports}
    />
  </main>;
}
