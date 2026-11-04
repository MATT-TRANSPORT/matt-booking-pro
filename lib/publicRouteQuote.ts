import { quoteMultiStopRoute } from "@/lib/multiStopRoutes";
import { shortestDrivingRouteKm } from "@/lib/routesServer";
import { PUBLIC_BOOKING_FREE_PICKUP_KM } from "@/lib/bookingRouteBase";

// Apply the pickup allowance per direction; extra-stop detours remain separate.
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
  const chargedLeg = (actual: number, pickup: number) =>
    Math.min(actual, pickup, pickupExcessKm) + Math.max(0, actual - pickup);
  const outboundBillableKm = Math.round(10 * chargedLeg(route.outbound.detourKm, pickupOnly.outbound.detourKm)) / 10;
  const inboundBillableKm = Math.round(10 * chargedLeg(route.inbound.detourKm, pickupOnly.inbound.detourKm)) / 10;
  const billableKm = Math.round(10 * (outboundBillableKm + inboundBillableKm)) / 10;
  return { ...route, distanceKm, freePickupKm: PUBLIC_BOOKING_FREE_PICKUP_KM, billableKm, outboundBillableKm, inboundBillableKm };
}
