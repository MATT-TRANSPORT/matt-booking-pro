import { customerJson, requestCustomerLocale } from "@/lib/customerErrors";
import { NextRequest, NextResponse } from "next/server";
const BASE_ADDRESS = "ul. Kościelna 29, 44-213 Książenice, Polska";
export async function POST(req: NextRequest) {
  let responseLocale=requestCustomerLocale(req);
  const json=(payload:any,init?:ResponseInit)=>customerJson(responseLocale,payload,init);
  try {
    const body = await req.json();
 responseLocale=requestCustomerLocale(req,body?.locale);
    const address = typeof body?.address === "string" ? body.address.trim() : "";
    if (address.length<3) return json({ error: "Podaj miejscowość, ulicę i numer adresu." }, { status: 400 });
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) return json({ error: "Brak GOOGLE_MAPS_API_KEY" }, { status: 500 });
    const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: { "Content-Type":"application/json", "X-Goog-Api-Key":key, "X-Goog-FieldMask":"routes.distanceMeters,routes.duration" },
      body: JSON.stringify({ origin:{address:BASE_ADDRESS}, destination:{address}, travelMode:"DRIVE", routingPreference:"TRAFFIC_UNAWARE", computeAlternativeRoutes:true, languageCode:"pl-PL", units:"METRIC" }),
      cache:"no-store",
      signal:AbortSignal.timeout(15000)
    });
    const data = await response.json();
    if (!response.ok) return json({ error:data?.error?.message ?? "Błąd Routes API" }, { status:response.status });
    const routes=(data.routes??[]).filter((r:any)=>typeof r.distanceMeters==="number" && Number.isFinite(r.distanceMeters) && r.distanceMeters>=0).sort((a:any,b:any)=>a.distanceMeters-b.distanceMeters);
    if(!routes.length) return json({error:"Nie znaleziono trasy."},{status:404});
    const distanceKm=Math.round((routes[0].distanceMeters/1000)*10)/10;
    const billableKm=Math.max(0,distanceKm - 40);
    return json({distanceKm,billableKm:Math.round(billableKm*10)/10,extraOneWay:Math.round(billableKm*2.4*100)/100});
  } catch {
    return json({error:"Nie udało się obliczyć dojazdu. Sprawdź adres i spróbuj ponownie."},{status:502});
  }
}
