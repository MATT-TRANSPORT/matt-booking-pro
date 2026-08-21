import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRICES } from "@/lib/pricing";

function n(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Brak uprawnień." }, { status: 403 });
  }

  const body = await req.json();
  const originAddress = String(body.pricingOriginAddress || "").trim();

  if (originAddress.length < 5) {
    return NextResponse.json(
      { error: "Uzupełnij siedzibę kontrahenta do kalkulacji kilometrów." },
      { status: 400 }
    );
  }

  const effectiveFrom = String(body.effectiveFrom || new Date().toISOString().slice(0, 10));
  const freeKm = Math.max(0, n(body.freeKm, 40));
  const extraKmRateNet = Math.max(0, n(body.extraKmRateNet, 2.4));
  const paymentDays = Math.max(0, Math.round(n(body.paymentDays, 14)));
  const defaultPaymentMethod =
    body.defaultPaymentMethod === "employee_payment"
      ? "employee_payment"
      : "company_transfer";
  const useCustomPricing = Boolean(body.useCustomPricing);

  const { data: terms, error } = await admin
    .from("company_pricing_terms")
    .insert({
      company_id: id,
      effective_from: effectiveFrom,
      active: true,
      pricing_origin_address: originAddress,
      free_km: freeKm,
      extra_km_rate_net: extraKmRateNet,
      vat_rate: 8,
      use_custom_pricing: useCustomPricing,
      payment_days: paymentDays,
      default_payment_method: defaultPaymentMethod,
      commercial_notes: body.notes || null,
      created_by: user.id
    })
    .select("*")
    .single();

  if (error || !terms) {
    return NextResponse.json(
      { error: error?.message || "Nie udało się zapisać warunków." },
      { status: 500 }
    );
  }

  const priceRows = Object.keys(PRICES).map((airportKey) => {
    const row = body.prices?.[airportKey] || {};
    const car = String(row.car ?? "").trim();
    const bus = String(row.bus ?? "").trim();

    return {
      terms_id: terms.id,
      airport_key: airportKey,
      car_price_net: car === "" ? null : Math.max(0, n(car)),
      bus_price_net: bus === "" ? null : Math.max(0, n(bus))
    };
  });

  const { error: pricesError } = await admin
    .from("company_pricing_airport_prices")
    .insert(priceRows);

  if (pricesError) {
    await admin.from("company_pricing_terms").delete().eq("id", terms.id);
    return NextResponse.json({ error: pricesError.message }, { status: 500 });
  }

  // Legacy mirror: starsze widoki/API pozostają zgodne do czasu pełnego przejścia na v3.3.
  await admin
    .from("companies")
    .update({
      pricing_origin_address: originAddress,
      free_pickup_km: Math.round(freeKm),
      use_custom_pricing: useCustomPricing,
      payment_days: paymentDays,
      default_payment_method: defaultPaymentMethod,
      internal_notes: body.notes || null,
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  return NextResponse.json({ ok: true, terms });
}
