import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin","dispatcher"].includes(profile.role))
    return NextResponse.json({ error: "Brak uprawnień." }, { status: 403 });

  const b = await req.json();
  const payload = {
    name: b.name,
    registration: b.registration,
    color: b.color || null,
    seats: Number(b.seats || 4),
    type: b.type || "car",
    mileage: b.mileage ? Number(b.mileage) : null,
    inspection_date: b.inspectionDate || null,
    insurance_date: b.insuranceDate || null,
    notes: b.notes || null,
    active: b.active !== false,
    status: b.active === false ? "inactive" : "available"
  };

  if (b.action === "create") {
    const { data, error } = await admin.from("vehicles").insert(payload).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }
  if (b.action === "update") {
    const { data, error } = await admin.from("vehicles").update(payload).eq("id", b.id).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }
  return NextResponse.json({ error: "Nieznana operacja." }, { status: 400 });
}
