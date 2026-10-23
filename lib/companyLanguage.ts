import { cookies } from "next/headers";
import { isBookingLocale, resolveCustomerLocale, withCustomerLocale } from "@/lib/bookingLocale";
import { companyText } from "@/lib/companyCopy";

export type CompanySearchParams = Record<string,string|string[]|undefined>;
export async function companyLanguage(searchParams?:Promise<CompanySearchParams>) {
 const params=await searchParams;
 const raw=Array.isArray(params?.lang)?params.lang[0]:params?.lang;
 const saved=(await cookies()).get("matt-booking-locale")?.value;
 const locale=resolveCustomerLocale(isBookingLocale(raw)?raw:saved);
 return {locale,t:(key:string)=>companyText(key,locale),href:(path:string)=>withCustomerLocale(path,locale)};
}
