import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMattEmail } from "@/lib/email";
import { receivedEmail, adminNewBookingEmail } from "@/lib/emailTemplates";
import { bookingPricingFields, calculateCompanyQuote } from "@/lib/companyPricing";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
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
    return NextResponse.json({ error: "Brak przypisanej firmy." }, { status: 403 });
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

    if (!n.firstName || !n.lastName) {
      return NextResponse.json(
        { error: "Podaj imię i nazwisko nowego pracownika." },
        { status: 400 }
      );
    }

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
          phone: n.phone || null,
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

  const vehicle = body.vehicleType === "bus" ? "bus" : "car";
  const passengers = Math.max(1, Math.min(8, Number(body.passengers || 1)));

  if (passengers > 3 && vehicle !== "bus") {
    return NextResponse.json(
      { error: "Dla więcej niż 3 pasażerów wybierz bus." },
      { status: 400 }
    );
  }

  let quote;
  try {
    // Cena i kilometry są ZAWSZE liczone ponownie na backendzie.
    // Nie ufamy distanceKm/total przesłanym z przeglądarki.
    quote = await calculateCompanyQuote(admin, {
      companyId: membership.company_id,
      pickupAddress: String(body.address || ""),
      airportKey: String(body.airport || ""),
      vehicleType: vehicle,
      serviceType: String(body.serviceType || "to_airport")
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nie udało się obliczyć wyceny B2B."
      },
      { status: 400 }
    );
  }

  const paymentMethod =
    body.paymentMethod === "employee_payment"
      ? "employee_payment"
      : body.paymentMethod === "company_transfer"
      ? "company_transfer"
      : quote.defaultPaymentMethod;

  const { data, error } = await admin
    .from("bookings")
    .insert({
      company_id: membership.company_id,
      company_employee_id: employee.id,
      ordered_by_user_id: user.id,
      booking_source: "b2b_portal",
      payment_method: paymentMethod,
      service_type: quote.serviceType,
      pickup_address: body.address,
      airport_key: quote.airportKey,
      airport_label: quote.airportLabel,
      travel_date: body.travelDate,
      travel_time: body.travelTime,
      return_date: body.returnDate || null,
      return_time: body.returnTime || null,
      passengers,
      vehicle_type: quote.vehicleType,
      customer_name: `${employee.first_name} ${employee.last_name}`,
      phone: employee.phone || "",
      email: employee.email || "",
      invoice_required: true,
      flight_number: body.flightNumber || null,
      return_flight_number: body.returnFlightNumber || null,
      status: "pending",
      notes: body.notes || null,
      ...bookingPricingFields(quote)
    })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Nie udało się zapisać rezerwacji." },
      { status: 500 }
    );
  }

  await admin.from("booking_history").insert({
    booking_id: data.id,
    event:
      `Rezerwacja utworzona przez portal B2B · ` +
      `${quote.net.toFixed(2)} zł netto + VAT ${quote.vatRate.toFixed(0)}% = ${quote.gross.toFixed(2)} zł brutto · ` +
      `${quote.distanceKm.toFixed(1)} km od siedziby, ${quote.billableKm.toFixed(1)} km płatne`,
    created_by: user.id
  });

  const { data: companyForMail } = await admin
    .from("companies")
    .select("email")
    .eq("id", membership.company_id)
    .single();

  let emailSent = false;
  let adminEmailSent = false;
  let emailWarning: string | null = null;

  try {
    const companyAdminEmail = companyForMail?.email || user.email || null;

    if (companyAdminEmail) {
      const customerMail = receivedEmail(data);
      const customerResult = await sendMattEmail({
        to: companyAdminEmail,
        subject: customerMail.subject,
        html: customerMail.html
      });
      emailSent = customerResult.sent;

      if (!customerResult.sent) {
        emailWarning = `Firma: ${customerResult.error || "nie udało się wysłać"}`;
      }
    } else {
      emailWarning = "Firma: brak adresu e-mail odbiorcy.";
    }

    const adminMail = adminNewBookingEmail(data, data.email, data.phone);
    const adminResult = await sendMattEmail({
      to: "kontakt@matt-transport.pl",
      subject: `B2B · ${adminMail.subject}`,
      html: adminMail.html
    });
    adminEmailSent = adminResult.sent;

    if (!adminResult.sent) {
      emailWarning = [
        emailWarning,
        `MATT: ${adminResult.error || "nie udało się wysłać"}`
      ].filter(Boolean).join(" · ");
    }
  } catch (mailError) {
    emailWarning =
      mailError instanceof Error ? mailError.message : "Nieznany błąd e-mail B2B";
  }

  const { error: emailHistoryError } = await admin
    .from("booking_history")
    .insert({
      booking_id: data.id,
      event:
        emailSent && adminEmailSent
          ? "E-mail B2B: firma i MATT otrzymali powiadomienie."
          : `E-mail B2B: firma=${emailSent ? "OK" : "BŁĄD"}, MATT=${adminEmailSent ? "OK" : "BŁĄD"}${emailWarning ? ` · ${emailWarning}` : ""}`,
      created_by: user.id
    });

  if (emailHistoryError) {
    console.error("Historia e-mail B2B:", emailHistoryError);
  }

  return NextResponse.json({
    ...data,
    quote,
    email_sent: emailSent,
    admin_email_sent: adminEmailSent,
    email_warning: emailWarning
  });
}
