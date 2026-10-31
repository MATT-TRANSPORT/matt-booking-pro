import { customerJson, requestCustomerLocale } from "@/lib/customerErrors";
import { NextRequest, NextResponse } from "next/server";
import { calculateAdditionalStopDetour } from "@/lib/additionalStopServer";
import { quoteMultiStopRoute } from "@/lib/multiStopRoutes";
import { PUBLIC_BOOKING_BASE_ADDRESS } from "@/lib/bookingRouteBase";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAirportPricing } from "@/lib/airportPricingServer";
import {
  ADDITIONAL_STOP_B2C_KM_RATE,
  ADDITIONAL_STOP_FEE_B2C,
  additionalStopDirectionCount
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
  if (body.routeStops !== undefined) {
    try {
      const airport = await getAirportPricing(createAdminClient(), String(body.airport || ""));
      if (!airport) return json({ error: "Nieprawidłowe lotnisko." }, { status: 400 });
      const route = await quoteMultiStopRoute({
        baseAddress: PUBLIC_BOOKING_BASE_ADDRESS,
        pickupAddress: String(body.address || ""),
        airportAddress: airport.route_address,
        serviceType: body.serviceType,
        outboundStops: body.routeStops?.outbound,
        inboundStops: body.routeStops?.inbound
      });
      return json({
        routeStops: body.routeStops,
        stopCount: route.chargedStopVisits,
        totalExtraKm: route.totalDetourKm,
        stopFee: money(route.chargedStopVisits * ADDITIONAL_STOP_FEE_B2C),
        stopExtraPrice: money(route.totalDetourKm * ADDITIONAL_STOP_B2C_KM_RATE)
      });
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "Nie udało się wycenić trasy." }, { status: 400 });
    }
  }
  const stopAddress = String(body.additionalStopAddress || "").trim();
  const serviceType = String(body.serviceType || "to_airport");
  const primary = Boolean(
    stopAddress && (serviceType === "roundtrip" ? body.additionalStopPrimary : true)
  );
  const returnLeg = Boolean(
    stopAddress && serviceType === "roundtrip" && body.additionalStopReturn
  );

  if (!stopAddress || (!primary && !returnLeg)) {
    return json({
      stopAddress: null,
      primaryExtraKm: 0,
      returnExtraKm: 0,
      totalExtraKm: 0,
      stopCount: 0,
      stopFee: 0,
      stopExtraPrice: 0
    });
  }

  try {
    const airport = await getAirportPricing(createAdminClient(), String(body.airport || ""));
    if (!airport) {
      return json({ error: "Nieprawidłowe lub nieaktywne lotnisko." }, { status: 400 });
    }

    const detour = await calculateAdditionalStopDetour({
      serviceType,
      pickupAddress: String(body.address || ""),
      airportKey: String(body.airport || ""),
      stopAddress,
      primary,
      returnLeg,
      airportAddress: airport.route_address
    });
    const stopCount = additionalStopDirectionCount({
      serviceType,
      primary: detour.primary,
      returnLeg: detour.returnLeg
    });

    return json({
      ...detour,
      stopCount,
      stopFee: money(stopCount * ADDITIONAL_STOP_FEE_B2C),
      stopExtraPrice: money(detour.totalExtraKm * ADDITIONAL_STOP_B2C_KM_RATE)
    });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Nie udało się obliczyć dodatkowego przystanku." },
      { status: 400 }
    );
  }
}
