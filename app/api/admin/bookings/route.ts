import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMattEmail } from "@/lib/email";
import {
  confirmedEmail,
  assignedEmail,
  completedEmail
} from "@/lib/emailTemplates";

const ALLOWED_STATUSES = [
  "pending",
  "confirmed",
  "assigned",
  "in_progress",
  "picked_up",
  "completed",
  "cancelled"
];

export async function POST(req: NextRequest) {
  const authClient = await createClient();

  const {
    data: { user }
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Brak autoryzacji" },
      { status: 401 }
    );
  }

  const {
    id,
    driverId,
    vehicleId,
    status,
    action
  } = await req.json();

  if (!id) {
    return NextResponse.json(
      { error: "Brak identyfikatora rezerwacji." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: current, error: readError } = await admin
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single();

  if (readError || !current) {
    return NextResponse.json(
      { error: readError?.message ?? "Nie znaleziono rezerwacji." },
      { status: 404 }
    );
  }

  if (action === "resend_confirmation") {
    const template =
      current.status === "assigned"
        ? assignedEmail(await enrichBooking(admin, current))
        : confirmedEmail(current);

    const mailResult = await sendMattEmail({
      to: current.email,
      subject: template.subject,
      html: template.html
    });

    if (!mailResult.sent) {
      return NextResponse.json(
        {
          error:
            mailResult.error ??
            "Nie udało się wysłać wiadomości."
        },
        { status: 500 }
      );
    }

    await admin.from("booking_history").insert({
      booking_id: id,
      event: "Ponownie wysłano potwierdzenie e-mail",
      created_by: user.id
    });

    return NextResponse.json({
      ok: true,
      email_sent: true
    });
  }

  let nextStatus = status || current.status;

  if (status && !ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: "Nieprawidłowy status rezerwacji." },
      { status: 400 }
    );
  }

  // Automatyczny status po przydzieleniu pełnej obsady.
  if (
    driverId &&
    vehicleId &&
    ["pending", "confirmed", "assigned"].includes(nextStatus)
  ) {
    nextStatus = "assigned";
  }

  const updateData = {
    driver_id: driverId || null,
    vehicle_id: vehicleId || null,
    status: nextStatus,
    updated_at: new Date().toISOString()
  };

  const { data: updated, error } = await admin
    .from("bookings")
    .update(updateData)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  const statusChanged = current.status !== nextStatus;
  const resourcesChanged =
    current.driver_id !== (driverId || null) ||
    current.vehicle_id !== (vehicleId || null);

  await admin.from("booking_history").insert({
    booking_id: id,
    event: `Aktualizacja: status ${nextStatus}${
      resourcesChanged ? ", zmieniono kierowcę/pojazd" : ""
    }`,
    created_by: user.id
  });

  let emailSent = false;
  let emailError: string | null = null;

  try {
    const enriched = await enrichBooking(admin, updated);
    let template: ReturnType<typeof confirmedEmail> | null = null;

    if (statusChanged && nextStatus === "confirmed") {
      template = confirmedEmail(enriched);
    } else if (
      (statusChanged || resourcesChanged) &&
      nextStatus === "assigned" &&
      updated.driver_id &&
      updated.vehicle_id
    ) {
      template = assignedEmail(enriched);
    } else if (statusChanged && nextStatus === "completed") {
      template = completedEmail(enriched);
    }

    if (template) {
      const result = await sendMattEmail({
        to: updated.email,
        subject: template.subject,
        html: template.html
      });

      emailSent = result.sent;
      emailError = result.error ?? null;

      if (result.sent) {
        await admin.from("booking_history").insert({
          booking_id: id,
          event: `Wysłano e-mail: ${template.subject}`,
          created_by: user.id
        });
      }
    }
  } catch (mailError) {
    emailError =
      mailError instanceof Error
        ? mailError.message
        : "Nieznany błąd e-mail";
    console.error("E-mail statusu:", mailError);
  }

  return NextResponse.json({
    ...updated,
    email_sent: emailSent,
    email_error: emailError
  });
}

async function enrichBooking(admin: any, booking: any) {
  let driver = null;
  let vehicle = null;

  if (booking.driver_id) {
    const { data } = await admin
      .from("drivers")
      .select("full_name,phone")
      .eq("id", booking.driver_id)
      .single();
    driver = data;
  }

  if (booking.vehicle_id) {
    const { data } = await admin
      .from("vehicles")
      .select("name,registration")
      .eq("id", booking.vehicle_id)
      .single();
    vehicle = data;
  }

  return {
    ...booking,
    driver_name: driver?.full_name ?? null,
    driver_phone: driver?.phone ?? null,
    vehicle_name: vehicle?.name ?? null,
    vehicle_registration: vehicle?.registration ?? null
  };
}
