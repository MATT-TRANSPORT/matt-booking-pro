import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function access() {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 }) };
  const { data: membership } = await auth.from("company_users")
    .select("company_id,role").eq("user_id", user.id).eq("active", true).maybeSingle();
  if (!membership) return { error: NextResponse.json({ error: "Brak firmy." }, { status: 403 }) };
  if (!["admin","manager","dispatcher"].includes(String(membership.role || ""))) {
    return { error: NextResponse.json({ error: "Brak uprawnień do szablonów." }, { status: 403 }) };
  }
  return { user, membership, admin: createAdminClient() } as any;
}

export async function POST(req: NextRequest) {
  const ctx = await access();
  if (ctx.error) return ctx.error;
  const { user, membership, admin } = ctx;
  const body = await req.json();
  const action = String(body.action || "create");

  if (action === "delete") {
    const { error } = await admin.from("company_booking_templates")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("id", body.id).eq("company_id", membership.company_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "from_booking") {
    const { data: booking } = await admin.from("bookings").select("*")
      .eq("id", body.bookingId).eq("company_id", membership.company_id).maybeSingle();
    if (!booking) return NextResponse.json({ error: "Nie znaleziono rezerwacji firmy." }, { status: 404 });
    const name = String(body.name || `${booking.customer_name} · ${booking.airport_label}`).trim().slice(0, 120);
    const { data, error } = await admin.from("company_booking_templates").insert({
      company_id: membership.company_id,
      name,
      employee_id: booking.company_employee_id || null,
      pickup_address: booking.pickup_address,
      airport_key: booking.airport_key,
      service_type: booking.service_type,
      vehicle_type: booking.vehicle_type,
      passengers: booking.passengers || 1,
      flight_number: booking.flight_number || null,
      notes: booking.notes || null,
      payment_method: booking.payment_method || null,
      additional_stop_address: booking.additional_stop_address || null,
      additional_stop_primary: Boolean(booking.additional_stop_primary),
      additional_stop_return: Boolean(booking.additional_stop_return),
      created_by: user.id
    }).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  const payload = {
    company_id: membership.company_id,
    name: String(body.name || "").trim().slice(0, 120),
    employee_id: body.employeeId || null,
    pickup_address: String(body.address || "").trim(),
    airport_key: String(body.airport || ""),
    service_type: String(body.serviceType || "to_airport"),
    vehicle_type: String(body.vehicleType || "car"),
    passengers: Math.max(1, Math.min(8, Number(body.passengers || 1))),
    flight_number: String(body.flightNumber || "").trim() || null,
    notes: String(body.notes || "").trim() || null,
    payment_method: String(body.paymentMethod || "company_transfer"),
    additional_stop_address: String(body.additionalStopAddress || "").trim() || null,
    additional_stop_primary: Boolean(body.additionalStopPrimary),
    additional_stop_return: Boolean(body.additionalStopReturn),
    active: true,
    updated_at: new Date().toISOString()
  };
  if (!payload.name || !payload.pickup_address || !payload.airport_key || !payload.employee_id) {
    return NextResponse.json({ error: "Uzupełnij nazwę, pracownika, adres i lotnisko." }, { status: 400 });
  }

  if (action === "update") {
    const { data, error } = await admin.from("company_booking_templates").update(payload)
      .eq("id", body.id).eq("company_id", membership.company_id).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  const { data, error } = await admin.from("company_booking_templates")
    .insert({ ...payload, created_by: user.id }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
