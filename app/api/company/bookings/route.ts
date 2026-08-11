import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRICES } from "@/lib/pricing";
import { sendMattEmail } from "@/lib/email";
import {
  receivedEmail,
  adminNewBookingEmail
} from "@/lib/emailTemplates";

export async function POST(req: NextRequest) {
  const auth = await createClient();

  const {
    data: { user }
  } = await auth.auth.getUser();

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
    return NextResponse.json(
      { error: "Brak przypisanej firmy." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const admin = createAdminClient();

  let employee: any = null;

  if (body.employeeId) {
    const { data } = await admin
      .from("company_employees")
      .select("*")
      .eq("id", body.employeeId)
      .eq("company_id", membership.company_id)
      .eq("active", true)
      .single();

    employee = data;
  } else if (body.newEmployee) {
    const n = body.newEmployee;

    if (!n.firstName || !n.lastName || !n.phone) {
      return NextResponse.json(
        { error: "Podaj imię, nazwisko i telefon nowego pracownika." },
        { status: 400 }
      );
    }

    // Deduplication: first by e-mail, then by phone.
    if (n.email) {
      const { data } = await admin
        .from("company_employees")
        .select("*")
        .eq("company_id", membership.company_id)
        .eq("email", n.email)
        .limit(1)
        .maybeSingle();

      employee = data;
    }

    if (!employee && n.phone) {
      const { data } = await admin
        .from("company_employees")
        .select("*")
        .eq("company_id", membership.company_id)
        .eq("phone", n.phone)
        .limit(1)
        .maybeSingle();

      employee = data;
    }

    if (!employee) {
      const { data, error } = await admin
        .from("company_employees")
        .insert({
          company_id: membership.company_id,
          first_name: n.firstName,
          last_name: n.lastName,
          phone: n.phone,
          email: n.email || null,
          default_address: n.defaultAddress || body.address || null,
          department: n.department || null,
          active: true
        })
        .select("*")
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      employee = data;
    }
  }

  if (!employee) {
    return NextResponse.json(
      { error: "Nie udało się ustalić pasażera." },
      { status: 400 }
    );
  }

  const price = PRICES[body.airport as keyof typeof PRICES];

  if (!price) {
    return NextResponse.json(
      { error: "Nieprawidłowe lotnisko." },
      { status: 400 }
    );
  }

  const vehicle = body.vehicleType === "bus" ? "bus" : "car";

  if (Number(body.passengers) > 3 && vehicle !== "bus") {
    return NextResponse.json(
      { error: "Dla więcej niż 3 pasażerów wybierz bus." },
      { status: 400 }
    );
  }

  const multiplier = body.serviceType === "roundtrip" ? 2 : 1;
  const base = price[vehicle] * multiplier;
  const extra =
    Math.max(0, Number(body.distanceKm || 0) - 20) * 2.4 * multiplier;
  const total = base + extra;

  const { data, error } = await admin
    .from("bookings")
    .insert({
      company_id: membership.company_id,
      company_employee_id: employee.id,
      ordered_by_user_id: user.id,
      booking_source: "b2b_portal",
      service_type: body.serviceType,
      pickup_address: body.address,
      airport_key: body.airport,
      airport_label: price.label,
      travel_date: body.travelDate,
      travel_time: body.travelTime,
      return_date: body.returnDate || null,
      return_time: body.returnTime || null,
      passengers: Number(body.passengers || 1),
      vehicle_type: vehicle,
      distance_km: Number(body.distanceKm || 0),
      customer_name: `${employee.first_name} ${employee.last_name}`,
      phone: employee.phone || "",
      email: employee.email || "",
      invoice_required: true,
      flight_number: body.flightNumber || null,
      return_flight_number: body.returnFlightNumber || null,
      base_price: base,
      extra_price: extra,
      vat_price: 0,
      total_price: total,
      status: "pending",
      notes: body.notes || null
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.from("booking_history").insert({
    booking_id: data.id,
    event: "Rezerwacja utworzona przez portal B2B",
    created_by: user.id
  });

  // Email is active whenever RESEND_API_KEY exists in Vercel.
  let emailSent = false;
  let adminEmailSent = false;

  try {
    if (data.email) {
      const customerMail = receivedEmail(data);
      const customerResult = await sendMattEmail({
        to: data.email,
        subject: customerMail.subject,
        html: customerMail.html
      });
      emailSent = customerResult.sent;
    }

    const adminMail = adminNewBookingEmail(data, data.email, data.phone);
    const adminResult = await sendMattEmail({
      to: "kontakt@matt-transport.pl",
      subject: `B2B · ${adminMail.subject}`,
      html: adminMail.html
    });
    adminEmailSent = adminResult.sent;
  } catch (mailError) {
    console.error("E-mail B2B:", mailError);
  }

  return NextResponse.json({
    ...data,
    email_sent: emailSent,
    admin_email_sent: adminEmailSent
  });
}
