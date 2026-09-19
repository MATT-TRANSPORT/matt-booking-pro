import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAirportCatalog } from "@/lib/airportPricingServer";

export const runtime = "nodejs";

async function requireAdmin() {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 }) };
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: NextResponse.json({ error: "Brak uprawnień." }, { status: 403 }) };
  }

  return { admin, user };
}

function slug(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function money(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

export async function GET() {
  const access = await requireAdmin();
  if ("error" in access) return access.error;

  try {
    const rows = await getAirportCatalog(access.admin, { includeInactive: true });
    return NextResponse.json({ rows });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się pobrać cennika." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const access = await requireAdmin();
  if ("error" in access) return access.error;

  const body = await req.json();
  const action = String(body.action || "");
  const label = String(body.label || "").trim();
  const routeAddress = String(body.routeAddress || "").trim();
  const carPrice = money(body.carPrice);
  const busPrice = money(body.busPrice);
  const sortOrder = Math.max(0, Math.round(Number(body.sortOrder || 0)));

  if (action === "create") {
    const airportKey = slug(body.airportKey || label);

    if (!airportKey || !label || !routeAddress || carPrice === null || busPrice === null) {
      return NextResponse.json(
        { error: "Podaj nazwę, adres lotniska oraz prawidłowe ceny samochodu i busa." },
        { status: 400 }
      );
    }

    const { data, error } = await access.admin
      .from("airport_pricing")
      .insert({
        airport_key: airportKey,
        label,
        route_address: routeAddress,
        car_price: carPrice,
        bus_price: busPrice,
        active: body.active !== false,
        sort_order: sortOrder || 100
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.code === "23505" ? "Lotnisko o takim kluczu już istnieje." : error.message },
        { status: error.code === "23505" ? 409 : 500 }
      );
    }

    return NextResponse.json({ row: data });
  }

  if (action === "update") {
    const airportKey = String(body.airportKey || "").trim();

    if (!airportKey || !label || !routeAddress || carPrice === null || busPrice === null) {
      return NextResponse.json(
        { error: "Podaj nazwę, adres lotniska oraz prawidłowe ceny samochodu i busa." },
        { status: 400 }
      );
    }

    const { data, error } = await access.admin
      .from("airport_pricing")
      .update({
        label,
        route_address: routeAddress,
        car_price: carPrice,
        bus_price: busPrice,
        active: body.active !== false,
        sort_order: sortOrder,
        updated_at: new Date().toISOString()
      })
      .eq("airport_key", airportKey)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ row: data });
  }

  if (action === "toggle") {
    const airportKey = String(body.airportKey || "").trim();
    const { data, error } = await access.admin
      .from("airport_pricing")
      .update({
        active: Boolean(body.active),
        updated_at: new Date().toISOString()
      })
      .eq("airport_key", airportKey)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ row: data });
  }

  return NextResponse.json({ error: "Nieznana operacja." }, { status: 400 });
}
