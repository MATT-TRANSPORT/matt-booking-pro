import { customerJson, requestCustomerLocale } from "@/lib/customerErrors";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function membershipForCurrentUser() {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return { error: "Brak autoryzacji.", status: 401 as const };

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("company_users")
    .select("company_id,role,active")
    .eq("user_id", user.id)
    .eq("active", true)
    .single();

  if (!membership) return { error: "Brak dostępu do firmy.", status: 403 as const };
  return { admin, user, membership };
}

function clean(value: unknown, max = 300) {
  return String(value || "").trim().slice(0, max);
}

export async function GET() {
  const session = await membershipForCurrentUser();
  if ("error" in session) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const { data, error } = await session.admin
    .from("company_addresses")
    .select("id,label,address,active,created_at")
    .eq("company_id", session.membership.company_id)
    .eq("active", true)
    .order("label");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ addresses: data ?? [] });
}

export async function POST(req: NextRequest) {
  let responseLocale=requestCustomerLocale(req);
  const json=(payload:any,init?:ResponseInit)=>customerJson(responseLocale,payload,init);
  const session = await membershipForCurrentUser();
  if ("error" in session) {
    return json({ error: session.error }, { status: session.status });
  }

  if (!["admin", "manager"].includes(session.membership.role)) {
    return json({ error: "Tylko administrator lub manager firmy może zarządzać adresami." }, { status: 403 });
  }

  const body = await req.json();
 responseLocale=requestCustomerLocale(req,body?.locale);
  const action = clean(body.action, 20);
  const id = clean(body.id, 80);

  if (action === "create") {
    const label = clean(body.label, 80);
    const address = clean(body.address, 400);
    if (label.length < 2 || address.length < 5) {
      return json({ error: "Podaj nazwę i pełny adres." }, { status: 400 });
    }

    const { data, error } = await session.admin
      .from("company_addresses")
      .insert({ company_id: session.membership.company_id, label, address, active: true })
      .select("id,label,address,active,created_at")
      .single();
    if (error) return json({ error: error.message }, { status: 500 });
    return json(data);
  }

  if (action === "update") {
    const label = clean(body.label, 80);
    const address = clean(body.address, 400);
    if (!id || label.length < 2 || address.length < 5) {
      return json({ error: "Nieprawidłowe dane adresu." }, { status: 400 });
    }

    const { data, error } = await session.admin
      .from("company_addresses")
      .update({ label, address })
      .eq("id", id)
      .eq("company_id", session.membership.company_id)
      .select("id,label,address,active,created_at")
      .single();
    if (error) return json({ error: error.message }, { status: 500 });
    return json(data);
  }

  if (action === "delete") {
    if (!id) return json({ error: "Brak adresu." }, { status: 400 });
    const { error } = await session.admin
      .from("company_addresses")
      .update({ active: false })
      .eq("id", id)
      .eq("company_id", session.membership.company_id);
    if (error) return json({ error: error.message }, { status: 500 });
    return json({ ok: true });
  }

  return json({ error: "Nieznana operacja." }, { status: 400 });
}
