import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function normalizeNip(value: unknown) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 10);
}

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

async function requireAdmin() {
  const auth = await createClient();
  const {
    data: { user }
  } = await auth.auth.getUser();

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

async function findDuplicateCompany(
  admin: ReturnType<typeof createAdminClient>,
  nip: string,
  email: string,
  excludeId?: string
) {
  const { data, error } = await admin
    .from("companies")
    .select("id,name,nip,email")
    .limit(1000);

  if (error) throw error;

  return (data ?? []).find((company: any) => {
    if (excludeId && company.id === excludeId) return false;

    const sameNip = nip && normalizeNip(company.nip) === nip;
    const sameEmail = email && normalizeEmail(company.email) === email;

    // NIP jest głównym identyfikatorem firmy. E-mail blokujemy również,
    // żeby nie utworzyć przypadkiem drugiego konta B2B dla tego samego kontaktu.
    return Boolean(sameNip || sameEmail);
  }) ?? null;
}

export async function POST(req: NextRequest) {
  const access = await requireAdmin();
  if ("error" in access) return access.error;

  const { admin } = access;
  const body = await req.json();
  const action = String(body.action || "");

  if (action === "create") {
    const name = String(body.name || "").trim();
    const nip = normalizeNip(body.nip);
    const email = normalizeEmail(body.email);

    if (!name) {
      return NextResponse.json({ error: "Nazwa firmy jest wymagana." }, { status: 400 });
    }

    try {
      const duplicate = await findDuplicateCompany(admin, nip, email);
      if (duplicate) {
        return NextResponse.json(
          { error: `Firma o tym NIP-ie lub e-mailu już istnieje: ${duplicate.name}.` },
          { status: 409 }
        );
      }
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data, error } = await admin
      .from("companies")
      .insert({
        name,
        nip: nip || null,
        email: email || null,
        phone: String(body.phone || "").trim() || null,
        contact_person: String(body.contactPerson || "").trim() || null,
        payment_days: Number(body.paymentDays || 14),
        discount_percent: Number(body.discount || 0),
        free_pickup_km: Number(body.freeKm || 40),
        default_payment_method: body.defaultPayment || "company_transfer",
        internal_notes: String(body.notes || "").trim() || null,
        active: true
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (action === "update") {
    const id = String(body.id || "");
    const name = String(body.name || "").trim();
    const nip = normalizeNip(body.nip);
    const email = normalizeEmail(body.email);

    if (!id || !name) {
      return NextResponse.json({ error: "Brak wymaganych danych firmy." }, { status: 400 });
    }

    const { data: company } = await admin
      .from("companies")
      .select("id,name")
      .eq("id", id)
      .maybeSingle();

    if (!company) {
      return NextResponse.json({ error: "Nie znaleziono firmy." }, { status: 404 });
    }

    try {
      const duplicate = await findDuplicateCompany(admin, nip, email, id);
      if (duplicate) {
        return NextResponse.json(
          { error: `Inna firma używa już tego NIP-u lub e-maila: ${duplicate.name}.` },
          { status: 409 }
        );
      }
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data, error } = await admin
      .from("companies")
      .update({
        name,
        nip: nip || null,
        email: email || null,
        phone: String(body.phone || "").trim() || null,
        contact_person: String(body.contactPerson || "").trim() || null,
        active: body.active !== false,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (action === "delete") {
    const id = String(body.id || "");
    const confirmName = String(body.confirmName || "").trim();

    if (!id) {
      return NextResponse.json({ error: "Brak identyfikatora firmy." }, { status: 400 });
    }

    const { data: company } = await admin
      .from("companies")
      .select("id,name")
      .eq("id", id)
      .maybeSingle();

    if (!company) {
      return NextResponse.json({ error: "Nie znaleziono firmy." }, { status: 404 });
    }

    if (confirmName !== company.name) {
      return NextResponse.json(
        { error: "Potwierdzenie nazwy firmy jest nieprawidłowe." },
        { status: 400 }
      );
    }

    const { count: bookingsCount, error: bookingsError } = await admin
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("company_id", id);

    if (bookingsError) {
      return NextResponse.json({ error: bookingsError.message }, { status: 500 });
    }

    if ((bookingsCount ?? 0) > 0) {
      return NextResponse.json(
        {
          error:
            "Nie można trwale usunąć firmy, która ma historię rezerwacji. Ustaw ją jako nieaktywną w edycji danych firmy."
        },
        { status: 409 }
      );
    }

    const { error } = await admin.from("companies").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  }

  if (action === "terms") {
    const { data, error } = await admin
      .from("companies")
      .update({
        payment_days: Number(body.paymentDays),
        discount_percent: Number(body.discount),
        free_pickup_km: Number(body.freeKm),
        default_payment_method: body.defaultPayment,
        use_custom_pricing: Boolean(body.useCustomPricing),
        internal_notes: body.notes || null
      })
      .eq("id", body.id)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "Nieznana operacja." }, { status: 400 });
}
