"use client";
import { useCustomerLocale } from "@/lib/useCustomerLocale";
import { withCustomerLocale } from "@/lib/bookingLocale";
import { customerText } from "@/lib/customerCopy";

const links = [
  ["/firma","Dashboard"],
  ["/firma/nowa-rezerwacja","+ Nowa rezerwacja"],
  ["/firma/szablony","Szablony i cykliczne"],
  ["/firma/kalendarz","Kalendarz"],
  ["/firma/cennik","Cennik i warunki"],
  ["/firma/pracownicy","Pracownicy"],
  ["/firma/faktury","Rozliczenia"],
  ["/firma/ustawienia","Dane firmy"]
] as const;
export default function CompanyNav({ customerLocale }: { customerLocale?: unknown } = {}) {
  const locale=useCustomerLocale(customerLocale);
  return <nav className="nav company-nav">{links.map(([path,label])=><a key={path} href={withCustomerLocale(path,locale)}>{customerText(label,locale)}</a>)}</nav>;
}
