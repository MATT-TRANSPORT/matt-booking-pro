import { customerJson, requestCustomerLocale } from "@/lib/customerErrors";
import { NextRequest } from "next/server";
import { quotePublicMultiStopRoute } from "@/lib/publicRouteQuote";
import { PUBLIC_BOOKING_BASE_ADDRESS } from "@/lib/bookingRouteBase";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAirportPricing } from "@/lib/airportPricingServer";
import {
  ADDITIONAL_STOP_B2C_KM_RATE,
  ADDITIONAL_STOP_FEE_B2C
} from "@/lib/additionalStopConfig";

export const runtime = "nodejs";

function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function POST(req: NextRequest) {
  let responseLocale=requestCustomerLocale(req);
  const json=(payload:any,init?:ResponseInit)=>customerJson(responseLocale,payload,init);
  const body = await req.json();
 responseLocale=requestCustomerLocale(req,body?.locale);
  if (body.routeStops === undefined) {
    const stop = String(body.additionalStopAddress || "").trim();
    body.routeStops = {
      outbound: stop && (body.serviceType !== "roundtrip" || body.additionalStopPrimary) ? [stop] : [],
      inbound: stop && body.serviceType === "roundtrip" && body.additionalStopReturn ? [stop] : []
    };
  }
  if (body.routeStops !== undefined) {
    try {
      const airport = await getAirportPricing(createAdminClient(), String(body.airport || ""));
      if (!airport) return json({ error: "Nieprawidłowe lotnisko." }, { status: 400 });
      const route = await quotePublicMultiStopRoute({
        baseAddress: PUBLIC_BOOKING_BASE_ADDRESS,
        pickupAddress: String(body.address || ""),
        airportAddress: airport.route_address,
        serviceType: body.serviceType,
        outboundStops: body.routeStops?.outbound,
        inboundStops: body.routeStops?.inbound
      });
      return json({
        routeStops: body.routeStops,
        distanceKm: route.distanceKm,
        freePickupKm: route.freePickupKm,
        measuredDetourKm: route.totalDetourKm,
        stopCount: route.chargedStopVisits,
        totalExtraKm: route.billableKm,
        pickupExtraKm: route.pickupBillableKm,
        pickupExtraPrice: money(route.pickupBillableKm * ADDITIONAL_STOP_B2C_KM_RATE),
        stopDetourKm: route.stopBillableKm,
        stopDetourPrice: money(route.stopBillableKm * ADDITIONAL_STOP_B2C_KM_RATE),
        stopFee: money(route.chargedStopVisits * ADDITIONAL_STOP_FEE_B2C),
        stopExtraPrice: money(route.billableKm * ADDITIONAL_STOP_B2C_KM_RATE)
      });
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "Nie udało się wycenić trasy." }, { status: 400 });
    }
  }
}
