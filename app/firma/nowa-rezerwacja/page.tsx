import CompanyNav from "@/components/CompanyNav";
import CompanyBookingForm from "@/components/CompanyBookingForm";
import { companyClient } from "@/lib/company";
export default async function Page(){const {s,company}=await companyClient();const {data}=await s.from("company_employees").select("*").eq("company_id",company.id).eq("active",true).order("last_name").order("first_name");return <main className="container"><h1>Nowa rezerwacja</h1><CompanyNav/><CompanyBookingForm employees={data??[]}/></main>}
