import { NextResponse } from "next/server";
import { isBookingLocale, resolveCustomerLocale } from "@/lib/bookingLocale";
import { customerCopy } from "@/lib/customerCopy";
import { companyCopy } from "@/lib/companyCopy";
import { customerErrorCopy } from "@/lib/customerErrorCopy";

const known:Record<string,[string,string,string]>={...customerCopy,...companyCopy,...customerErrorCopy};
const reverse=new Map<string,string>();
for(const [pl,row]of Object.entries(known))for(const value of row)reverse.set(value,pl);
const fallback={pl:"Nie udało się wykonać operacji. Spróbuj ponownie lub skontaktuj się z MATT TRANSPORT.",en:"Could not complete the request. Try again or contact MATT TRANSPORT.",de:"Die Anfrage konnte nicht abgeschlossen werden. Versuchen Sie es erneut oder kontaktieren Sie MATT TRANSPORT.",cs:"Požadavek se nepodařilo dokončit. Zkuste to znovu nebo kontaktujte MATT TRANSPORT."};
export function requestCustomerLocale(req:any,stored?:unknown) {
 const raw=req?.nextUrl?.searchParams?.get("lang")||req?.headers?.get("x-matt-locale");
 return resolveCustomerLocale(isBookingLocale(raw)?raw:stored);
}
export function customerErrorText(value:string,localeInput:unknown) {
 const locale=resolveCustomerLocale(localeInput),trimmed=value.trim();
 const bilingual=trimmed.split(" / ")[0];
 const key=known[trimmed]?trimmed:known[bilingual]?bilingual:reverse.get(trimmed);
 if(!key)return fallback[locale];
 return locale==="pl"?key:known[key][locale==="en"?0:locale==="de"?1:2];
}
export function customerJson(locale:unknown,payload:any,init?:ResponseInit) {
 if(payload&&typeof payload==="object"&&!Array.isArray(payload)) {
  const translated={...payload};
  for(const key of ['error','message'])if(typeof translated[key]==="string")translated[key]=customerErrorText(translated[key],locale);
  return NextResponse.json(translated,init);
 }
 return NextResponse.json(payload,init);
}

/** Reject malformed request bodies before opening a privileged database client. */
export async function readCustomerBody(req: any) {
 let body: unknown;
 try { body = await req.json(); } catch { body = null; }
 if (!body || typeof body !== "object" || Array.isArray(body)) {
  return { ok: false as const, response: customerJson(requestCustomerLocale(req),
   { error: "Nieprawidłowe dane formularza." }, { status: 400 }) };
 }
 const locale = requestCustomerLocale(req, (body as Record<string, unknown>).locale);
 return { ok: true as const, body: { ...body, locale } as Record<string, any>, locale };
}
