import { quoteMultiStopRoute } from "@/lib/multiStopRoutes";
import { shortestDrivingRouteKm } from "@/lib/routesServer";
import { PUBLIC_BOOKING_FREE_PICKUP_KM, PUBLIC_BOOKING_FREE_DETOUR_KM } from "@/lib/bookingRouteBase";

// One allowance per complete leg, including pickup and every ordered stop.
export async function quotePublicMultiStopRoute(input: Parameters<typeof quoteMultiStopRoute>[0]) {
  const [route, pickupDistance] = await Promise.all([
    quoteMultiStopRoute(input),
    shortestDrivingRouteKm(input.baseAddress, input.pickupAddress)
  ]);
  const distanceKm = pickupDistance.distanceKm;
  if (!Number.isFinite(distanceKm) || distanceKm < 0) throw new Error("Nieprawidłowa odległość trasy.");
  const pickupExcessKm = Math.max(0, distanceKm - PUBLIC_BOOKING_FREE_PICKUP_KM);
  const pickupOnly = route.chargedStopVisits === 0 ? route : await quoteMultiStopRoute({
    ...input, outboundStops: [], inboundStops: []
  });
  const pickupPart = (actual: number, pickup: number) => Math.min(actual, pickup, pickupExcessKm);
  const chargedLeg = (actual: number, pickup: number) => Math.max(
    pickupPart(actual, pickup), actual - PUBLIC_BOOKING_FREE_DETOUR_KM, 0
  );
  const outboundBillableKm = Math.round(10 * chargedLeg(route.outbound.detourKm, pickupOnly.outbound.detourKm)) / 10;
  const inboundBillableKm = Math.round(10 * chargedLeg(route.inbound.detourKm, pickupOnly.inbound.detourKm)) / 10;
  const billableKm = Math.round(10 * (outboundBillableKm + inboundBillableKm)) / 10;
  const pickupBillableKm = Math.round(10 * (chargedLeg(pickupOnly.outbound.detourKm, pickupOnly.outbound.detourKm) + chargedLeg(pickupOnly.inbound.detourKm, pickupOnly.inbound.detourKm))) / 10;
  const allocatedPickupKm = Math.min(billableKm, pickupBillableKm);
  const stopBillableKm = Math.round(10 * (billableKm - allocatedPickupKm)) / 10;
  return { ...route, distanceKm, freePickupKm: PUBLIC_BOOKING_FREE_PICKUP_KM, freeDetourKm: PUBLIC_BOOKING_FREE_DETOUR_KM, billableKm, pickupBillableKm: allocatedPickupKm, stopBillableKm, outboundBillableKm, inboundBillableKm };

}
