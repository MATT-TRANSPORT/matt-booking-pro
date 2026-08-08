import { NextRequest, NextResponse } from "next/server";
const BASE_ADDRESS = "ul. Wyzwolenia 20, Rybnik, Polska";
export async function POST(req: NextRequest) {
  const { address } = await req.json();
  if (!address) return NextResponse.json({ error: "Brak adresu." }, { status: 400 });
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ error: "Brak GOOGLE_MAPS_API_KEY" }, { status: 500 });
  const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: { "Content-Type":"application/json", "X-Goog-Api-Key":key, "X-Goog-FieldMask":"routes.distanceMeters,routes.duration" },
    body: JSON.stringify({ origin:{address:BASE_ADDRESS}, destination:{address}, travelMode:"DRIVE", routingPreference:"TRAFFIC_UNAWARE", computeAlternativeRoutes:true, languageCode:"pl-PL", units:"METRIC" }),
    cache:"no-store"
  });
  const data = await response.json();
  if (!response.ok) return NextResponse.json({ error:data?.error?.message ?? "Błąd Routes API" }, { status:response.status });
  const routes=(data.routes??[]).filter((r:any)=>r.distanceMeters).sort((a:any,b:any)=>a.distanceMeters-b.distanceMeters);
  if(!routes.length) return NextResponse.json({error:"Nie znaleziono trasy."},{status:404});
  const distanceKm=Math.round((routes[0].distanceMeters/1000)*10)/10;
  const billableKm=Math.max(0,distanceKm-20);
  return NextResponse.json({distanceKm,billableKm:Math.round(billableKm*10)/10,extraOneWay:Math.round(billableKm*2.4*100)/100});
}
