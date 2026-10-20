import { customerJson, requestCustomerLocale, readCustomerBody } from "@/lib/customerErrors";
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

function daysBetween(from?: string | null, to?: string | null) {
  if (!from || !to) return 0;
  const a = Date.parse(`${String(from).slice(0,10)}T12:00:00Z`);
  const b = Date.parse(`${String(to).slice(0,10)}T12:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86400000));
}

export async function POST(req: NextRequest) {
  let responseLocale=requestCustomerLocale(req);
  const json=(payload:any,init?:ResponseInit)=>customerJson(responseLocale,payload,init);
  const ctx = await access();
  if (ctx.error) return ctx.error;
  const { user, membership, admin } = ctx;
  const parsed = await readCustomerBody(req);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;
  responseLocale = parsed.locale;
  const action = String(body.action || "create");

  if (!["create", "update", "delete", "from_booking"].includes(action)) {
    return json({ error: "Nieprawidłowe dane formularza." }, { status: 400 });
  }
  if ((action === "delete" || action === "update") && (typeof body.id !== "string" || !body.id.trim())) {
    return json({ error: "Nieprawidłowe dane formularza." }, { status: 400 });
  }
  if (action === "delete") {
    const { error } = await admin.from("company_booking_templates")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("id", body.id).eq("company_id", membership.company_id);
    if (error) return json({ error: error.message }, { status: 500 });
    return json({ ok: true });
  }

  if (action === "from_booking") {
    if (typeof body.bookingId !== "string" || !body.bookingId.trim()) {
      return json({ error: "Nieprawidłowe dane formularza." }, { status: 400 });
    }
    const { data: booking } = await admin.from("bookings").select("*")
      .eq("id", body.bookingId).eq("company_id", membership.company_id).maybeSingle();
    if (!booking) return json({ error: "Nie znaleziono rezerwacji firmy." }, { status: 404 });
    if (!booking.company_employee_id) return json({ error: "Nie udało się ustalić pasażera." }, { status: 400 });
    const { data: employee } = await admin.from("company_employees").select("id")
      .eq("id", booking.company_employee_id).eq("company_id", membership.company_id).eq("active", true).maybeSingle();
    if (!employee) return json({ error: "Nie udało się ustalić pasażera." }, { status: 400 });
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
      return_offset_days: daysBetween(booking.travel_date, booking.return_date),
      return_time: booking.return_time ? String(booking.return_time).slice(0,5) : null,
      return_flight_number: booking.return_flight_number || null,
      notes: booking.notes || null,
      payment_method: booking.payment_method || null,
      additional_stop_address: booking.additional_stop_address || null,
      additional_stop_primary: Boolean(booking.additional_stop_primary),
      additional_stop_return: Boolean(booking.additional_stop_return),
      created_by: user.id
    }).select("*").single();
    if (error) return json({ error: error.message }, { status: 500 });
    return json(data);
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
    return_offset_days: Math.max(0, Math.min(60, Number(body.returnOffsetDays || 0))),
    return_time: String(body.returnTime || "").slice(0,5) || null,
    return_flight_number: String(body.returnFlightNumber || "").trim() || null,
    notes: String(body.notes || "").trim() || null,
    payment_method: String(body.paymentMethod || "company_transfer"),
    additional_stop_address: String(body.additionalStopAddress || "").trim() || null,
    additional_stop_primary: Boolean(body.additionalStopPrimary),
    additional_stop_return: Boolean(body.additionalStopReturn),
    active: true,
    updated_at: new Date().toISOString()
  };
  if (!payload.name || !payload.pickup_address || !payload.airport_key || !payload.employee_id) {
    return json({ error: "Uzupełnij nazwę, pracownika, adres i lotnisko." }, { status: 400 });
  }
  if (payload.service_type === "roundtrip" && !payload.return_time) {
    return json({ error: "Dla kursu w obie strony podaj godzinę powrotu." }, { status: 400 });
  }

  const { data: activeEmployee } = await admin.from("company_employees").select("id")
    .eq("id", payload.employee_id).eq("company_id", membership.company_id).eq("active", true).maybeSingle();
  if (!activeEmployee) return json({ error: "Nie udało się ustalić pasażera." }, { status: 400 });

  if (action === "update") {
    const { data, error } = await admin.from("company_booking_templates").update(payload)
      .eq("id", body.id).eq("company_id", membership.company_id).select("*").single();
    if (error) return json({ error: error.message }, { status: 500 });
    return json(data);
  }

  const { data, error } = await admin.from("company_booking_templates")
    .insert({ ...payload, created_by: user.id }).select("*").single();
  if (error) return json({ error: error.message }, { status: 500 });
  return json(data);
}
