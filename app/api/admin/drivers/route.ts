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

  if (b.action === "create") {
    const { data, error } = await admin.from("drivers").insert({
      full_name: b.fullName,
      phone: b.phone || null,
      email: b.email || null,
      license_number: b.licenseNumber || null,
      notes: b.notes || null,
      active: true,
      status: "available"
    }).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (b.action === "update") {
    const { data, error } = await admin.from("drivers").update({
      full_name: b.fullName,
      phone: b.phone || null,
      email: b.email || null,
      license_number: b.licenseNumber || null,
      notes: b.notes || null,
      active: Boolean(b.active),
      status: b.active ? "available" : "inactive"
    }).eq("id", b.id).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "Nieznana operacja." }, { status: 400 });
}
