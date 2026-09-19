import { PRICES } from "@/lib/pricing";
import { AIRPORT_ROUTE_ADDRESSES } from "@/lib/additionalStopConfig";

export type AirportPricingRow = {
  airport_key: string;
  label: string;
  route_address: string;
  car_price: number;
  bus_price: number;
  active: boolean;
  sort_order: number;
};

function missingAirportPricingTable(error: any) {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();
  return code === "PGRST205" || code === "42P01" || message.includes("airport_pricing");
}

function fallbackRows(): AirportPricingRow[] {
  return Object.entries(PRICES).map(([airport_key, row], index) => ({
    airport_key,
    label: row.label,
    route_address: AIRPORT_ROUTE_ADDRESSES[airport_key] || row.label,
    car_price: Number(row.car),
    bus_price: Number(row.bus),
    active: true,
    sort_order: (index + 1) * 10
  }));
}

export async function getAirportCatalog(
  admin: any,
  options?: { includeInactive?: boolean }
): Promise<AirportPricingRow[]> {
  let query = admin
    .from("airport_pricing")
    .select("airport_key,label,route_address,car_price,bus_price,active,sort_order")
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });

  if (!options?.includeInactive) {
    query = query.eq("active", true);
  }

  const { data, error } = await query;

  if (error) {
    if (missingAirportPricingTable(error)) {
      return fallbackRows().filter((row) => options?.includeInactive || row.active);
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row: any) => ({
    airport_key: String(row.airport_key),
    label: String(row.label),
    route_address: String(row.route_address),
    car_price: Number(row.car_price),
    bus_price: Number(row.bus_price),
    active: Boolean(row.active),
    sort_order: Number(row.sort_order ?? 0)
  }));
}

export async function getAirportPricing(
  admin: any,
  airportKey: string,
  options?: { includeInactive?: boolean }
): Promise<AirportPricingRow | null> {
  let query = admin
    .from("airport_pricing")
    .select("airport_key,label,route_address,car_price,bus_price,active,sort_order")
    .eq("airport_key", airportKey)
    .limit(1);

  if (!options?.includeInactive) {
    query = query.eq("active", true);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    if (missingAirportPricingTable(error)) {
      return fallbackRows().find((row) => row.airport_key === airportKey) ?? null;
    }
    throw new Error(error.message);
  }

  if (!data) return null;

  return {
    airport_key: String(data.airport_key),
    label: String(data.label),
    route_address: String(data.route_address),
    car_price: Number(data.car_price),
    bus_price: Number(data.bus_price),
    active: Boolean(data.active),
    sort_order: Number(data.sort_order ?? 0)
  };
}

export function airportPriceMap(rows: AirportPricingRow[]) {
  return Object.fromEntries(
    rows.map((row) => [
      row.airport_key,
      {
        label: row.label,
        car: Number(row.car_price),
        bus: Number(row.bus_price),
        routeAddress: row.route_address
      }
    ])
  );
}
