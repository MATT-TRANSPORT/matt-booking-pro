import CompanyNav from "@/components/CompanyNav";
import CompanyEmployees from "@/components/CompanyEmployees";
import { companyClient } from "@/lib/company";
export default async function Page(){
  const {s,company}=await companyClient();
  const {data}=await s.from("company_employees").select("*").eq("company_id",company.id).order("last_name").order("first_name");
  return <main className="container"><h1>Pracownicy</h1><CompanyNav/><CompanyEmployees employees={data??[]}/></main>;
}
