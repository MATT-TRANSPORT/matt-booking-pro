import { NextRequest, NextResponse } from "next/server";
import { shortestDrivingRouteKm } from "@/lib/routesServer";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const origin = String(body.origin || "").trim();
  const destination = String(body.destination || "").trim();
  if (!origin || !destination) {
    return NextResponse.json({ error: "Podaj punkt A i punkt B." }, { status: 400 });
  }
  try {
    const route = await shortestDrivingRouteKm(origin, destination);
    return NextResponse.json(route);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nie udało się obliczyć trasy." }, { status: 400 });
  }
}
