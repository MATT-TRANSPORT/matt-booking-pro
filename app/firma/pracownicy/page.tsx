import { companyLanguage, type CompanySearchParams } from "@/lib/companyLanguage";
import CompanyNav from "@/components/CompanyNav";
import CompanyEmployees from "@/components/CompanyEmployees";
import { companyClient } from "@/lib/company";
export default async function Page({searchParams}:{searchParams:Promise<CompanySearchParams>}){
  const {locale,t,href}=await companyLanguage(searchParams);
  const {s,company}=await companyClient(locale);
  const {data}=await s.from("company_employees").select("*").eq("company_id",company.id).order("last_name").order("first_name");
  return <main className="container"><h1>{t("Pracownicy")}</h1><CompanyNav customerLocale={locale}/><CompanyEmployees employees={data??[]}/></main>;
}
