import { customerJson, requestCustomerLocale } from "@/lib/customerErrors";
import { NextRequest, NextResponse } from "next/server";
export async function GET(req: NextRequest) {
  let responseLocale=requestCustomerLocale(req);
  const json=(payload:any,init?:ResponseInit)=>customerJson(responseLocale,payload,init);
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 3) return json({ suggestions: [] });
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return json({ error: "Brak GOOGLE_MAPS_API_KEY" }, { status: 500 });
  const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text" },
    body: JSON.stringify({ input: q, includedRegionCodes: ["pl"], languageCode: "pl" }),
    cache: "no-store"
  });
  const data = await response.json();
  if (!response.ok) return json({ error: data?.error?.message ?? "Błąd Places API" }, { status: response.status });
  return json({ suggestions: data.suggestions?.map((s:any)=>({ placeId:s.placePrediction?.placeId, text:s.placePrediction?.text?.text })) ?? [] });
}
