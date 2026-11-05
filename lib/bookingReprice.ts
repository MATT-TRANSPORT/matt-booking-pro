import { calculateCompanyQuote, bookingPricingFields } from "@/lib/companyPricing";
import { quotePublicMultiStopRoute } from "@/lib/publicRouteQuote";
import { publicRouteSnapshot } from "@/lib/multiStopRoutes";
import { calculateQuote } from "@/lib/pricing";
import { getAirportPricing } from "@/lib/airportPricingServer";
import { PUBLIC_BOOKING_BASE_ADDRESS } from "@/lib/bookingRouteBase";

export function canRepriceBooking(b: any) {
  return b.status === "pending" && [null, undefined, "pending", "unpaid", "failed"].includes(b.payment_status)
    && !b.payment_paid_at && !b.payment_checkout_session_id && !b.payment_intent_id
    && ["to_airport", "from_airport", "roundtrip"].includes(b.service_type);
}

export async function repriceBooking(admin: any, b: any) {
  if (!canRepriceBooking(b)) throw new Error("Można przeliczyć tylko niepotwierdzony i nieopłacony transfer bez rozpoczętej płatności.");
  const routeStops = b.pricing_snapshot?.route_stops ?? {
    outbound: b.additional_stop_address && b.additional_stop_primary ? [b.additional_stop_address] : [],
    inbound: b.additional_stop_address && b.additional_stop_return ? [b.additional_stop_address] : []
  };
  if (b.company_id) {
    const quote = await calculateCompanyQuote(admin, {
      companyId: b.company_id, pickupAddress: b.pickup_address, airportKey: b.airport_key,
      vehicleType: b.vehicle_type, serviceType: b.service_type,
      termsId: b.company_pricing_terms_id, routeStops, allowInactiveAirport: true
    });
    return bookingPricingFields(quote);
  }
  const airport = await getAirportPricing(admin, b.airport_key, { includeInactive: true });
  if (!airport) throw new Error("Nie znaleziono lotniska.");
  const route = await quotePublicMultiStopRoute({
    baseAddress: PUBLIC_BOOKING_BASE_ADDRESS, pickupAddress: b.pickup_address,
    airportAddress: airport.route_address, serviceType: b.service_type,
    outboundStops: routeStops.outbound, inboundStops: routeStops.inbound
  });
  const quote = calculateQuote({
    serviceType: b.service_type, airport: b.airport_key, vehicleType: b.vehicle_type,
    distanceKm: route.distanceKm, pickupBillableKm: route.pickupBillableKm,
    invoiceRequired: Boolean(b.invoice_required), additionalStopCount: route.chargedStopVisits,
    additionalStopExtraKm: route.stopBillableKm,
    priceRow: { car: airport.car_price, bus: airport.bus_price }
  });
  return {
    distance_km: route.distanceKm, base_price: quote.basePrice, extra_price: quote.extraPrice,
    additional_stop_fee: quote.additionalStopFee, additional_stop_extra_price: quote.additionalStopExtraPrice,
    vat_price: quote.vatPrice, total_price: quote.totalPrice,
    pricing_snapshot: { ...publicRouteSnapshot(b.service_type, route), free_pickup_km: 30,
      billable_km: route.billableKm, pickup_billable_km: route.pickupBillableKm, stop_billable_km: route.stopBillableKm }
  };
}
