import { NextRequest, NextResponse } from "next/server";
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 3) return NextResponse.json({ suggestions: [] });
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ error: "Brak GOOGLE_MAPS_API_KEY" }, { status: 500 });
  const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text" },
    body: JSON.stringify({ input: q, includedRegionCodes: ["pl"], languageCode: "pl" }),
    cache: "no-store"
  });
  const data = await response.json();
  if (!response.ok) return NextResponse.json({ error: data?.error?.message ?? "Błąd Places API" }, { status: response.status });
  return NextResponse.json({ suggestions: data.suggestions?.map((s:any)=>({ placeId:s.placePrediction?.placeId, text:s.placePrediction?.text?.text })) ?? [] });
}
