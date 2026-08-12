import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRICES } from "@/lib/pricing";
import { sendMattEmail } from "@/lib/email";

const EDITABLE_STATUSES = ["pending", "confirmed", "assigned"];

function htmlUpdate(number: string, message: string) {
  return `
  <div style="font-family:Arial,sans-serif;background:#0b0e13;color:#fff;padding:28px">
    <div style="max-width:650px;margin:auto;background:#151923;padding:28px;border-radius:16px">
      <h2 style="color:#f1d28b">MATT TRANSPORT</h2>
      <h1>Zmiana rezerwacji ${number}</h1>
      <p>${message}</p>
      <p>W razie pytań: +48 691 242 691</p>
    </div>
  </div>`;
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

  const { data: membership } = await auth
    .from("company_users")
    .select("company_id,role")
    .eq("user_id", user.id)
    .eq("active", true)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Brak firmy." }, { status: 403 });
  }

  const body = await req.json();
  const admin = createAdminClient();

  const { data: current } = await admin
    .from("bookings")
    .select("*")
    .eq("id", id)
    .eq("company_id", membership.company_id)
    .single();

  if (!current) {
    return NextResponse.json(
      { error: "Nie znaleziono rezerwacji." },
      { status: 404 }
    );
  }

  if (body.action === "repeat") {
    if (!body.travelDate || !body.travelTime) {
      return NextResponse.json(
        { error: "Podaj nową datę i godzinę." },
        { status: 400 }
      );
    }

    const copy = {
      ...current,
      id: undefined,
      booking_number: undefined,
      created_at: undefined,
      updated_at: undefined,
      driver_id: null,
      vehicle_id: null,
      status: "pending",
      travel_date: body.travelDate,
      travel_time: body.travelTime,
      return_date: null,
      return_time: null,
      invoice_number: null,
      invoice_status: "not_invoiced",
      ordered_by_user_id: user.id,
      booking_source: "b2b_repeat"
    };

    const { data, error } = await admin
      .from("bookings")
      .insert(copy)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await admin.from("booking_history").insert({
      booking_id: data.id,
      event: `Powtórzono rezerwację ${current.booking_number}`,
      created_by: user.id
    });

    return NextResponse.json(data);
  }

  if (body.action !== "update") {
    return NextResponse.json({ error: "Nieznana operacja." }, { status: 400 });
  }

  if (!EDITABLE_STATUSES.includes(current.status)) {
    return NextResponse.json(
      { error: "Tej rezerwacji nie można już edytować w portalu firmy." },
      { status: 409 }
    );
  }

  const price = PRICES[(body.airport || current.airport_key) as keyof typeof PRICES];
  if (!price) {
    return NextResponse.json({ error: "Nieprawidłowe lotnisko." }, { status: 400 });
  }

  const vehicle = body.vehicleType === "bus" ? "bus" : "car";
  const serviceType = body.serviceType || current.service_type;
  const multiplier = serviceType === "roundtrip" ? 2 : 1;
  const distanceKm = Number(body.distanceKm ?? current.distance_km);
  const base = price[vehicle] * multiplier;
  const extra = Math.max(0, distanceKm - 40) * 2.4 * multiplier;
  const total = base + extra;

  const changes: string[] = [];
  const compare = (label: string, oldV: any, newV: any) => {
    if (String(oldV ?? "") !== String(newV ?? "")) {
      changes.push(`${label}: ${oldV ?? "—"} → ${newV ?? "—"}`);
    }
  };

  compare("adres", current.pickup_address, body.address);
  compare("data", current.travel_date, body.travelDate);
  compare("godzina", current.travel_time, body.travelTime);
  compare("lot", current.flight_number, body.flightNumber);
  compare("liczba pasażerów", current.passengers, body.passengers);
  compare("pojazd", current.vehicle_type, vehicle);
  compare("kwota", current.total_price, total);

  const { data, error } = await admin
    .from("bookings")
    .update({
      service_type: serviceType,
      pickup_address: body.address,
      airport_key: body.airport,
      airport_label: price.label,
      travel_date: body.travelDate,
      travel_time: body.travelTime,
      passengers: Number(body.passengers),
      vehicle_type: vehicle,
      distance_km: distanceKm,
      flight_number: body.flightNumber || null,
      notes: body.notes || null,
      base_price: base,
      extra_price: extra,
      total_price: total,
      status: current.status === "assigned" ? "confirmed" : current.status,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.from("booking_history").insert({
    booking_id: id,
    event: `Edycja przez firmę: ${changes.join("; ") || "zapisano dane"}`,
    created_by: user.id
  });

  if (data.email && changes.length) {
    await sendMattEmail({
      to: data.email,
      subject: `Zmieniono rezerwację ${data.booking_number}`,
      html: htmlUpdate(
        data.booking_number,
        `Zaktualizowano: ${changes.join(", ")}`
      )
    }).catch(() => null);
  }

  return NextResponse.json(data);
}
