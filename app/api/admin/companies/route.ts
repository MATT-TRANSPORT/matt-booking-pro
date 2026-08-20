import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRICES } from "@/lib/pricing";

async function requireAdmin() {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();

  if (!user) return { error: "Brak autoryzacji.", status: 401 } as const;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: "Brak uprawnień.", status: 403 } as const;
  }

  return { admin, user } as const;
}

function moneyOrNull(value: unknown) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) && number >= 0
    ? Math.round(number * 100) / 100
    : null;
}

async function insertTerms(
  admin: any,
  userId: string,
  companyId: string,
  body: any
) {
  const headquartersAddress = String(body.headquartersAddress || "").trim();

  if (!headquartersAddress) {
    throw new Error("Podaj siedzibę kontrahenta do kalkulacji kilometrów.");
  }

  const effectiveFrom =
    String(body.effectiveFrom || "").slice(0, 10) ||
    new Date().toISOString().slice(0, 10);

  const { data: terms, error } = await admin
    .from("company_commercial_terms")
    .insert({
      company_id: companyId,
      effective_from: effectiveFrom,
      headquarters_address: headquartersAddress,
      headquarters_place_id: body.headquartersPlaceId || null,
      free_km: Math.max(0, Number(body.freeKm ?? 40)),
      extra_km_rate_net: Math.max(0, Number(body.extraKmRateNet ?? 2.4)),
      vat_rate: 8,
      payment_days: Math.max(0, Number(body.paymentDays ?? 14)),
      default_payment_method:
        body.defaultPayment === "employee_payment"
          ? "employee_payment"
          : "company_transfer",
      use_custom_pricing: Boolean(body.useCustomPricing),
      discount_percent: Math.max(
        0,
        Math.min(100, Number(body.discount ?? 0))
      ),
      notes: body.notes || null,
      active: true,
      created_by: userId,
      updated_at: new Date().toISOString()
    })
    .select("*")
    .single();

  if (error || !terms) {
    throw new Error(error?.message || "Nie udało się zapisać warunków.");
  }

  const prices = body.prices || {};
  const rows = Object.keys(PRICES).map((airportKey) => ({
    terms_id: terms.id,
    airport_key: airportKey,
    car_price_net: moneyOrNull(prices?.[airportKey]?.car),
    bus_price_net: moneyOrNull(prices?.[airportKey]?.bus)
  }));

  const { error: priceError } = await admin
    .from("company_commercial_prices")
    .insert(rows);

  if (priceError) {
    await admin
      .from("company_commercial_terms")
      .delete()
      .eq("id", terms.id);
    throw new Error(priceError.message);
  }

  // Stare pola utrzymujemy jako fallback wyłącznie dla wersji,
  // która już obowiązuje. Przyszłe warunki nie zmieniają firmy przed czasem.
  if (effectiveFrom <= new Date().toISOString().slice(0, 10)) {
    await admin
      .from("companies")
      .update({
        address: headquartersAddress,
        payment_days: Math.max(0, Number(body.paymentDays ?? 14)),
        discount_percent: Math.max(
          0,
          Math.min(100, Number(body.discount ?? 0))
        ),
        free_pickup_km: Math.max(0, Number(body.freeKm ?? 40)),
        default_payment_method:
          body.defaultPayment === "employee_payment"
            ? "employee_payment"
            : "company_transfer",
        use_custom_pricing: Boolean(body.useCustomPricing),
        internal_notes: body.notes || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", companyId);
  }

  return terms;
}

export async function POST(req: NextRequest) {
  const access = await requireAdmin();
  if ("error" in access) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }

  const { admin, user } = access;
  const body = await req.json();

  if (body.action === "create") {
    if (!String(body.name || "").trim()) {
      return NextResponse.json(
        { error: "Podaj nazwę firmy." },
        { status: 400 }
      );
    }

    const { data, error } = await admin
      .from("companies")
      .insert({
        name: String(body.name).trim(),
        nip: body.nip || null,
        email: body.email || null,
        phone: body.phone || null,
        contact_person: body.contactPerson || null,
        address: body.headquartersAddress || null,
        payment_days: Number(body.paymentDays || 14),
        discount_percent: Number(body.discount || 0),
        free_pickup_km: Number(body.freeKm ?? 40),
        default_payment_method:
          body.defaultPayment || "company_transfer",
        use_custom_pricing: Boolean(body.useCustomPricing),
        internal_notes: body.notes || null,
        active: true
      })
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Nie udało się utworzyć firmy." },
        { status: 500 }
      );
    }

    if (String(body.headquartersAddress || "").trim()) {
      try {
        await insertTerms(admin, user.id, data.id, {
          ...body,
          effectiveFrom:
            body.effectiveFrom || new Date().toISOString().slice(0, 10)
        });
      } catch (termsError) {
        return NextResponse.json(
          {
            ...data,
            warning:
              termsError instanceof Error
                ? termsError.message
                : "Firma utworzona, ale warunki wymagają uzupełnienia."
          },
          { status: 201 }
        );
      }
    }

    return NextResponse.json(data);
  }

  if (body.action === "terms") {
    if (!body.id) {
      return NextResponse.json({ error: "Brak firmy." }, { status: 400 });
    }

    try {
      const terms = await insertTerms(admin, user.id, body.id, body);
      return NextResponse.json({ ok: true, terms });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Nie udało się zapisać warunków."
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: "Nieznana operacja." }, { status: 400 });
}
