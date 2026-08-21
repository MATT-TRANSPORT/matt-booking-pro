import CompanyNav from "@/components/CompanyNav";
import CompanyBookingForm from "@/components/CompanyBookingForm";
import { companyClient } from "@/lib/company";

export default async function Page() {
  const { s, company } = await companyClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: employees }, { data: terms }] = await Promise.all([
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
      .maybeSingle()
  ]);

  return (
    <main className="container">
      <h1>Nowa rezerwacja</h1>
      <CompanyNav />
      <CompanyBookingForm
        employees={employees ?? []}
        companyName={company.name}
        commercialTerms={terms ?? null}
      />
    </main>
  );
}
