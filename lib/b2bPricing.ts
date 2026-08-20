import { PRICES } from "@/lib/pricing";
import { shortestDrivingRouteKm } from "@/lib/routesServer";

export type B2BVehicle = "car" | "bus";
export type B2BService = "to_airport" | "from_airport" | "roundtrip";

export type CommercialTerms = {
  id: string;
  company_id: string;
  effective_from: string;
  headquarters_address: string | null;
  headquarters_place_id?: string | null;
  free_km: number | string;
  extra_km_rate_net: number | string;
  vat_rate: number | string;
  payment_days: number | string;
  default_payment_method: string;
  use_custom_pricing: boolean;
  discount_percent?: number | string | null;
  notes?: string | null;
  active?: boolean;
};

export type B2BQuote = {
  companyId: string;
  termsId: string;
  termsEffectiveFrom: string;
  pricingMode: "custom" | "standard";
  paymentDays: number;
  defaultPaymentMethod: string;
  airportKey: string;
  airportLabel: string;
  vehicleType: B2BVehicle;
  serviceType: B2BService;
  multiplier: number;
  headquartersAddress: string;
  pickupAddress: string;
  distanceFromHeadquartersKm: number;
  freeKm: number;
  billableKm: number;
  extraKmRateNet: number;
  unitBaseNet: number;
  baseNet: number;
  extraNet: number;
  discountPercent: number;
  discountNet: number;
  net: number;
  vatRate: number;
  vat: number;
  gross: number;
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;
const roundKm = (value: number) => Math.round(value * 10) / 10;

export async function getCommercialTerms(
  admin: any,
  companyId: string,
  travelDate?: string | null,
  termsId?: string | null
): Promise<{ terms: CommercialTerms; prices: Record<string, any> }> {
  const date =
    String(travelDate || "").slice(0, 10) ||
    new Date().toISOString().slice(0, 10);

  let terms: any = null;

  if (termsId) {
    const { data } = await admin
      .from("company_commercial_terms")
      .select("*")
      .eq("id", termsId)
      .eq("company_id", companyId)
      .maybeSingle();
    terms = data;
  }

  if (!terms) {
    const { data } = await admin
      .from("company_commercial_terms")
      .select("*")
      .eq("company_id", companyId)
      .eq("active", true)
      .lte("effective_from", date)
      .order("effective_from", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    terms = data;
  }

  if (!terms) {
    const { data: futureTerms } = await admin
      .from("company_commercial_terms")
      .select("effective_from")
      .eq("company_id", companyId)
      .eq("active", true)
      .gt("effective_from", date)
      .order("effective_from", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (futureTerms) {
      throw new Error(
        `Warunki handlowe firmy obowiązują dopiero od ${futureTerms.effective_from}. Ustaw wersję obowiązującą w dniu rezerwacji.`
      );
    }

    throw new Error(
      "Firma nie ma skonfigurowanych warunków handlowych B2B."
    );
  }

  if (!String(terms.headquarters_address || "").trim()) {
    throw new Error(
      "Uzupełnij w panelu MATT siedzibę kontrahenta do kalkulacji kilometrów."
    );
  }

  const { data: rows } = await admin
    .from("company_commercial_prices")
    .select("airport_key,car_price_net,bus_price_net")
    .eq("terms_id", terms.id);

  const prices: Record<string, any> = {};
  for (const row of rows || []) prices[row.airport_key] = row;

  return { terms, prices };
}

export async function calculateB2BQuote(
  admin: any,
  input: {
    companyId: string;
    travelDate?: string | null;
    serviceType: string;
    airport: string;
    vehicleType: string;
    pickupAddress: string;
    termsId?: string | null;
  }
): Promise<B2BQuote> {
  const row = PRICES[input.airport];
  if (!row) throw new Error("Nieprawidłowe lotnisko.");

  const vehicle: B2BVehicle =
    input.vehicleType === "bus" ? "bus" : "car";
  const service: B2BService =
    input.serviceType === "roundtrip"
      ? "roundtrip"
      : input.serviceType === "from_airport"
      ? "from_airport"
      : "to_airport";

  const { terms, prices } = await getCommercialTerms(
    admin,
    input.companyId,
    input.travelDate,
    input.termsId
  );

  const headquartersAddress = String(
    terms.headquarters_address || ""
  ).trim();
  const pickupAddress = String(input.pickupAddress || "").trim();
  if (!pickupAddress) throw new Error("Podaj adres pasażera.");

  const route = await shortestDrivingRouteKm(
    headquartersAddress,
    pickupAddress
  );

  const custom = prices[input.airport];
  const customValue =
    vehicle === "bus"
      ? custom?.bus_price_net
      : custom?.car_price_net;

  const useCustom =
    Boolean(terms.use_custom_pricing) &&
    customValue !== null &&
    customValue !== undefined &&
    String(customValue) !== "";

  const unitBaseNet = Number(
    useCustom ? customValue : row[vehicle]
  );

  const multiplier = service === "roundtrip" ? 2 : 1;
  const freeKm = Math.max(0, Number(terms.free_km ?? 0));
  const extraKmRateNet = Math.max(
    0,
    Number(terms.extra_km_rate_net ?? 0)
  );
  const distanceFromHeadquartersKm = roundKm(route.distanceKm);
  const billableKm = roundKm(
    Math.max(0, distanceFromHeadquartersKm - freeKm)
  );

  const baseNet = roundMoney(unitBaseNet * multiplier);
  const extraNet = roundMoney(
    billableKm * extraKmRateNet * multiplier
  );
  const discountPercent = Math.max(
    0,
    Math.min(100, Number(terms.discount_percent ?? 0))
  );
  const beforeDiscount = baseNet + extraNet;
  const discountNet = roundMoney(
    beforeDiscount * (discountPercent / 100)
  );
  const net = roundMoney(beforeDiscount - discountNet);
  const vatRate = Math.max(0, Number(terms.vat_rate ?? 8));
  const vat = roundMoney(net * (vatRate / 100));
  const gross = roundMoney(net + vat);

  return {
    companyId: input.companyId,
    termsId: terms.id,
    termsEffectiveFrom: terms.effective_from,
    pricingMode: useCustom ? "custom" : "standard",
    paymentDays: Number(terms.payment_days ?? 14),
    defaultPaymentMethod: terms.default_payment_method || "company_transfer",
    airportKey: input.airport,
    airportLabel: row.label,
    vehicleType: vehicle,
    serviceType: service,
    multiplier,
    headquartersAddress,
    pickupAddress,
    distanceFromHeadquartersKm,
    freeKm,
    billableKm,
    extraKmRateNet,
    unitBaseNet: roundMoney(unitBaseNet),
    baseNet,
    extraNet,
    discountPercent,
    discountNet,
    net,
    vatRate,
    vat,
    gross
  };
}

export function b2bBookingPriceFields(quote: B2BQuote) {
  return {
    distance_km: quote.distanceFromHeadquartersKm,
    base_price: quote.baseNet,
    extra_price: quote.extraNet,
    vat_price: quote.vat,
    total_price: quote.gross,
    b2b_terms_id: quote.termsId,
    b2b_headquarters_address: quote.headquartersAddress,
    b2b_distance_from_headquarters_km:
      quote.distanceFromHeadquartersKm,
    b2b_free_km: quote.freeKm,
    b2b_billable_km: quote.billableKm,
    b2b_extra_km_rate_net: quote.extraKmRateNet,
    b2b_unit_base_net: quote.unitBaseNet,
    b2b_base_net: quote.baseNet,
    b2b_extra_net: quote.extraNet,
    b2b_discount_percent: quote.discountPercent,
    b2b_discount_net: quote.discountNet,
    b2b_net: quote.net,
    b2b_vat_rate: quote.vatRate,
    b2b_vat: quote.vat,
    b2b_gross: quote.gross,
    b2b_pricing_mode: quote.pricingMode,
    b2b_terms_effective_from: quote.termsEffectiveFrom,
    b2b_pricing_snapshot: quote
  };
}
