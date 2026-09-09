import { NextRequest, NextResponse } from "next/server";
import { calculateAdditionalStopDetour } from "@/lib/additionalStopServer";
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
  const body = await req.json();
  const stopAddress = String(body.additionalStopAddress || "").trim();
  const serviceType = String(body.serviceType || "to_airport");
  const primary = Boolean(
    stopAddress && (serviceType === "roundtrip" ? body.additionalStopPrimary : true)
  );
  const returnLeg = Boolean(
    stopAddress && serviceType === "roundtrip" && body.additionalStopReturn
  );

  if (!stopAddress || (!primary && !returnLeg)) {
    return NextResponse.json({
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
    const detour = await calculateAdditionalStopDetour({
      serviceType,
      pickupAddress: String(body.address || ""),
      airportKey: String(body.airport || ""),
      stopAddress,
      primary,
      returnLeg
    });
    const stopCount = additionalStopDirectionCount({
      serviceType,
      primary: detour.primary,
      returnLeg: detour.returnLeg
    });

    return NextResponse.json({
      ...detour,
      stopCount,
      stopFee: money(stopCount * ADDITIONAL_STOP_FEE_B2C),
      stopExtraPrice: money(detour.totalExtraKm * ADDITIONAL_STOP_B2C_KM_RATE)
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się obliczyć dodatkowego przystanku." },
      { status: 400 }
    );
  }
}
