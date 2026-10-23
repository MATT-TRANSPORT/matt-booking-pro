import { companyLanguage, type CompanySearchParams } from "@/lib/companyLanguage";
export default async function Page({searchParams}:{searchParams:Promise<CompanySearchParams>}) {
  const {locale,t,href}=await companyLanguage(searchParams);
  return <main className="container" style={{maxWidth:650}}>
    <div className="card">
      <span className="badge">MATT BOOKING PRO ENTERPRISE</span>
      <h1>{t("Brak przypisanej firmy")}</h1>
      <p>{t("Konto jest zalogowane, ale nie zostało jeszcze przypisane do klienta biznesowego.")}</p>
      <p><a href="mailto:kontakt@matt-transport.pl">kontakt@matt-transport.pl</a><br/>
      <a href="tel:+48691242691">+48 691 242 691</a></p>
    </div>
  </main>;
}
