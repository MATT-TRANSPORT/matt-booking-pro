import { PRICES } from "@/lib/pricing";

export const B2B_VAT_RATE = 8;

export type CompanyQuote = {
  termsId: string | null;
  effectiveFrom: string | null;
  pricingSource: "custom" | "standard" | "legacy";
  originAddress: string;
  pickupAddress: string;
  airportKey: string;
  airportLabel: string;
  vehicleType: "car" | "bus";
  serviceType: string;
  multiplier: number;
  distanceKm: number;
  freeKm: number;
  billableKm: number;
  extraKmRateNet: number;
  baseOneWayNet: number;
  basePriceNet: number;
  extraPriceNet: number;
  net: number;
  vatRate: number;
  vat: number;
  gross: number;
  paymentDays: number;
  defaultPaymentMethod: "company_transfer" | "employee_payment";
  useCustomPricing: boolean;
  snapshot: Record<string, unknown>;
};

function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function km(value: number) {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

export async function shortestDrivingDistanceKm(
  originAddress: string,
  destinationAddress: string
) {
  const key = process.env.GOOGLE_MAPS_API_KEY;

  if (!key) {
    throw new Error("Brak GOOGLE_MAPS_API_KEY.");
  }

  if (!originAddress || !destinationAddress) {
    throw new Error("Brak adresu początkowego lub docelowego.");
  }

  const response = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration"
      },
      body: JSON.stringify({
        origin: { address: originAddress },
        destination: { address: destinationAddress },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
        computeAlternativeRoutes: true,
        languageCode: "pl-PL",
        units: "METRIC"
      }),
      cache: "no-store"
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message || "Nie udało się obliczyć trasy Google Routes."
    );
  }

  const routes = (data.routes ?? [])
    .filter((r: any) => Number(r.distanceMeters) > 0)
    .sort(
      (a: any, b: any) =>
        Number(a.distanceMeters) - Number(b.distanceMeters)
    );

  if (!routes.length) {
    throw new Error("Nie znaleziono trasy między siedzibą firmy a adresem pasażera.");
  }

  return km(Number(routes[0].distanceMeters) / 1000);
}

export async function getCompanyPricingTerms(
  admin: any,
  companyId: string,
  options?: { termsId?: string | null; asOf?: string }
) {
  if (options?.termsId) {
    const { data, error } = await admin
      .from("company_pricing_terms")
      .select("*")
      .eq("id", options.termsId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (data) return data;
  }

  const asOf = options?.asOf || new Date().toISOString().slice(0, 10);

  const { data, error } = await admin
    .from("company_pricing_terms")
    .select("*")
    .eq("company_id", companyId)
    .eq("active", true)
    .lte("effective_from", asOf)
    .order("effective_from", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (data) return data;

  // Awaryjna zgodność ze starszym modułem B2B.
  const { data: company, error: companyError } = await admin
    .from("companies")
    .select(
      "id,address,pricing_origin_address,free_pickup_km,use_custom_pricing,payment_days,default_payment_method"
    )
    .eq("id", companyId)
    .single();

  if (companyError || !company) {
    throw new Error(companyError?.message || "Nie znaleziono firmy.");
  }

  return {
    id: null,
    company_id: companyId,
    effective_from: null,
    pricing_origin_address:
      company.pricing_origin_address || company.address || "",
    free_km: Number(company.free_pickup_km ?? 40),
    extra_km_rate_net: 2.4,
    vat_rate: B2B_VAT_RATE,
    use_custom_pricing: Boolean(company.use_custom_pricing),
    payment_days: Number(company.payment_days ?? 14),
    default_payment_method:
      company.default_payment_method || "company_transfer",
    commercial_notes: null,
    legacy: true
  };
}

export async function calculateCompanyQuote(
  admin: any,
  input: {
    companyId: string;
    pickupAddress: string;
    airportKey: string;
    vehicleType: string;
    serviceType: string;
    termsId?: string | null;
  }
): Promise<CompanyQuote> {
  const airport = PRICES[input.airportKey];

  if (!airport) {
    throw new Error("Nieprawidłowe lotnisko.");
  }

  const terms = await getCompanyPricingTerms(admin, input.companyId, {
    termsId: input.termsId
  });

  const originAddress = String(terms.pricing_origin_address || "").trim();

  if (!originAddress || originAddress === "UZUPEŁNIJ SIEDZIBĘ KONTRAHENTA") {
    throw new Error(
      "Brak siedziby kontrahenta do kalkulacji B2B. Administrator MATT musi uzupełnić Warunki handlowe firmy."
    );
  }

  const pickupAddress = String(input.pickupAddress || "").trim();
  if (!pickupAddress) throw new Error("Podaj adres pasażera.");

  const vehicleType: "car" | "bus" =
    input.vehicleType === "bus" ? "bus" : "car";

  const serviceType = ["to_airport", "from_airport", "roundtrip"].includes(
    input.serviceType
  )
    ? input.serviceType
    : "to_airport";

  const multiplier = serviceType === "roundtrip" ? 2 : 1;
  const distanceKm = await shortestDrivingDistanceKm(
    originAddress,
    pickupAddress
  );

  const freeKm = km(Number(terms.free_km ?? 40));
  const billableKm = km(Math.max(0, distanceKm - freeKm));
  const extraKmRateNet = money(Number(terms.extra_km_rate_net ?? 2.4));

  let customPrice: any = null;

  if (terms.id && terms.use_custom_pricing) {
    const { data, error } = await admin
      .from("company_pricing_airport_prices")
      .select("car_price_net,bus_price_net")
      .eq("terms_id", terms.id)
      .eq("airport_key", input.airportKey)
      .maybeSingle();

    if (error) throw new Error(error.message);
    customPrice = data;
  }

  const customValue =
    vehicleType === "bus"
      ? customPrice?.bus_price_net
      : customPrice?.car_price_net;

  const hasCustom =
    Boolean(terms.use_custom_pricing) &&
    customValue !== null &&
    customValue !== undefined &&
    Number.isFinite(Number(customValue));

  const baseOneWayNet = money(
    hasCustom ? Number(customValue) : Number(airport[vehicleType])
  );
  const basePriceNet = money(baseOneWayNet * multiplier);
  const extraPriceNet = money(
    billableKm * extraKmRateNet * multiplier
  );
  const net = money(basePriceNet + extraPriceNet);
  const vatRate = money(Number(terms.vat_rate ?? B2B_VAT_RATE));
  const vat = money(net * (vatRate / 100));
  const gross = money(net + vat);
  const pricingSource: "custom" | "standard" | "legacy" =
    terms.legacy ? "legacy" : hasCustom ? "custom" : "standard";

  const snapshot = {
    version: 1,
    terms_id: terms.id,
    effective_from: terms.effective_from,
    pricing_source: pricingSource,
    origin_address: originAddress,
    pickup_address: pickupAddress,
    airport_key: input.airportKey,
    airport_label: airport.label,
    vehicle_type: vehicleType,
    service_type: serviceType,
    multiplier,
    distance_km: distanceKm,
    free_km: freeKm,
    billable_km: billableKm,
    extra_km_rate_net: extraKmRateNet,
    base_one_way_net: baseOneWayNet,
    base_price_net: basePriceNet,
    extra_price_net: extraPriceNet,
    price_net: net,
    vat_rate: vatRate,
    vat_amount: vat,
    price_gross: gross,
    calculated_at: new Date().toISOString()
  };

  return {
    termsId: terms.id,
    effectiveFrom: terms.effective_from,
    pricingSource,
    originAddress,
    pickupAddress,
    airportKey: input.airportKey,
    airportLabel: airport.label,
    vehicleType,
    serviceType,
    multiplier,
    distanceKm,
    freeKm,
    billableKm,
    extraKmRateNet,
    baseOneWayNet,
    basePriceNet,
    extraPriceNet,
    net,
    vatRate,
    vat,
    gross,
    paymentDays: Number(terms.payment_days ?? 14),
    defaultPaymentMethod:
      terms.default_payment_method === "employee_payment"
        ? "employee_payment"
        : "company_transfer",
    useCustomPricing: Boolean(terms.use_custom_pricing),
    snapshot
  };
}

export function bookingPricingFields(quote: CompanyQuote) {
  return {
    company_pricing_terms_id: quote.termsId,
    pricing_source: quote.pricingSource,
    pricing_origin_address: quote.originAddress,
    pricing_distance_km: quote.distanceKm,
    pricing_free_km: quote.freeKm,
    pricing_billable_km: quote.billableKm,
    pricing_extra_km_rate_net: quote.extraKmRateNet,
    price_net: quote.net,
    vat_rate: quote.vatRate,
    price_gross: quote.gross,
    pricing_snapshot: quote.snapshot,
    base_price: quote.basePriceNet,
    extra_price: quote.extraPriceNet,
    vat_price: quote.vat,
    total_price: quote.gross,
    distance_km: quote.distanceKm
  };
}
