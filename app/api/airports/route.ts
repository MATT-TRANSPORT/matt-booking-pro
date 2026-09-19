import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { airportPriceMap, getAirportCatalog } from "@/lib/airportPricingServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await getAirportCatalog(createAdminClient());
    return NextResponse.json(
      { airports: airportPriceMap(rows), rows },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się pobrać cennika lotnisk." },
      { status: 500 }
    );
  }
}
