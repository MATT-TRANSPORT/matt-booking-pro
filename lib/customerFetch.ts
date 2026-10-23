import { resolveCustomerLocale } from "@/lib/bookingLocale";

/** Send the explicit UI language only to our own API routes. */
export function customerFetch(locale:unknown,input:RequestInfo|URL,init?:RequestInit) {
 let ownApi=typeof input==="string"&&input.startsWith("/api/");
 if(!ownApi&&typeof window!=="undefined") {
   const value=typeof input==="string"||input instanceof URL?String(input):input.url;
   const url=new URL(value,window.location.origin);
   ownApi=url.origin===window.location.origin&&url.pathname.startsWith("/api/");
 }
 if(!ownApi)return fetch(input,init);
 const headers=new Headers(init?.headers??(input instanceof Request?input.headers:undefined));
 headers.set("x-matt-locale",resolveCustomerLocale(locale));
 return fetch(input,{...init,headers});
}
