import { customerJson, requestCustomerLocale } from "@/lib/customerErrors";
import { NextRequest, NextResponse } from "next/server";
import { shortestDrivingRouteKm } from "@/lib/routesServer";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let responseLocale=requestCustomerLocale(req);
  const json=(payload:any,init?:ResponseInit)=>customerJson(responseLocale,payload,init);
  const body = await req.json();
 responseLocale=requestCustomerLocale(req,body?.locale);
  const origin = String(body.origin || "").trim();
  const destination = String(body.destination || "").trim();
  if (!origin || !destination) {
    return json({ error: "Podaj punkt A i punkt B." }, { status: 400 });
  }
  try {
    const route = await shortestDrivingRouteKm(origin, destination);
    return json(route);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Nie udało się obliczyć trasy." }, { status: 400 });
  }
}
