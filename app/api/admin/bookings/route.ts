import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMattEmail } from "@/lib/email";
import { sendDriverPush } from "@/lib/pushServer";
import { syncBookingCalendar } from "@/lib/googleCalendar";
import { sendBookingNotification } from "@/lib/customerNotifications";
import {
  confirmedEmail,
  assignedEmail,
  completedEmail
} from "@/lib/emailTemplates";

async function recipientForBooking(admin:any, booking:any){
  if (booking.company_id) {
    const { data: company } = await admin
      .from("companies")
      .select("email")
      .eq("id", booking.company_id)
      .maybeSingle();

    if (company?.email) {
      return String(company.email).trim();
    }

    // Awaryjnie użyj e-maila konta, które utworzyło rezerwację B2B.
    if (booking.ordered_by_user_id) {
      const { data: orderedBy } =
        await admin.auth.admin.getUserById(
          booking.ordered_by_user_id
        );

      if (orderedBy?.user?.email) {
        return orderedBy.user.email;
      }
    }

    // Ostatni fallback: aktywny administrator/manager firmy.
    const { data: companyUsers } = await admin
      .from("company_users")
      .select("user_id,role")
      .eq("company_id", booking.company_id)
      .eq("active", true)
      .in("role", ["admin", "manager", "accounting"])
      .limit(10);

    for (const member of companyUsers ?? []) {
      const { data: account } =
        await admin.auth.admin.getUserById(
          member.user_id
        );

      if (account?.user?.email) {
        return account.user.email;
      }
    }

    return null;
  }

  return booking.email
    ? String(booking.email).trim()
    : null;
}

const ALLOWED_STATUSES = [
  "pending",
  "confirmed",
  "assigned",
  "in_progress",
  "arrived",
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

  const requestBody = await req.json();

  const {
    id,
    status,
    action
  } = requestBody;

  const hasDriverId =
    Object.prototype.hasOwnProperty.call(
      requestBody,
      "driverId"
    );

  const hasVehicleId =
    Object.prototype.hasOwnProperty.call(
      requestBody,
      "vehicleId"
    );

  const driverId =
    hasDriverId
      ? requestBody.driverId
      : undefined;

  const vehicleId =
    hasVehicleId
      ? requestBody.vehicleId
      : undefined;

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


  if (action === "duplicate") {
    const copy: any = { ...current };

    delete copy.id;
    delete copy.booking_number;
    delete copy.created_at;
    delete copy.updated_at;
    delete copy.customer_access_token;

    copy.driver_id = null;
    copy.vehicle_id = null;
    copy.status = "pending";
    copy.customer_access_token = crypto.randomUUID();
    copy.booking_source = "admin_duplicate";
    copy.invoice_number = null;
    copy.invoice_status = "not_invoiced";

    if ("payment_link" in copy) copy.payment_link = null;
    if ("payment_status" in copy) copy.payment_status = "pending";
    if ("payment_provider" in copy) copy.payment_provider = null;
    if ("payment_checkout_session_id" in copy) copy.payment_checkout_session_id = null;
    if ("payment_intent_id" in copy) copy.payment_intent_id = null;
    if ("payment_amount_cents" in copy) copy.payment_amount_cents = null;
    if ("payment_paid_at" in copy) copy.payment_paid_at = null;
    if ("payment_refunded_at" in copy) copy.payment_refunded_at = null;
    if ("payment_last_error" in copy) copy.payment_last_error = null;
    if ("payment_review_reason" in copy) copy.payment_review_reason = null;
    if ("customer_last_edited_at" in copy) copy.customer_last_edited_at = null;
    if ("google_calendar_event_id" in copy) copy.google_calendar_event_id = null;
    if ("google_calendar_return_event_id" in copy) copy.google_calendar_return_event_id = null;
    if ("google_calendar_synced_at" in copy) copy.google_calendar_synced_at = null;
    if ("google_calendar_sync_error" in copy) copy.google_calendar_sync_error = null;

    const { data: duplicated, error: duplicateError } = await admin
      .from("bookings")
      .insert(copy)
      .select("*")
      .single();

    if (duplicateError) {
      return NextResponse.json(
        { error: duplicateError.message },
        { status: 500 }
      );
    }

    await admin.from("booking_history").insert({
      booking_id: duplicated.id,
      event: `Utworzono jako kopię rezerwacji ${current.booking_number}`,
      created_by: user.id
    });

    return NextResponse.json({
      ok: true,
      duplicated: true,
      id: duplicated.id,
      booking_number: duplicated.booking_number
    });
  }

  if (action === "resend_confirmation") {
    const template =
      current.status === "assigned"
        ? assignedEmail(await enrichBooking(admin, current))
        : confirmedEmail(current);

    const mailResult = await sendMattEmail({
      to: await recipientForBooking(admin,current),
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

  const effectiveDriverId =
    hasDriverId
      ? driverId || null
      : current.driver_id || null;

  const effectiveVehicleId =
    hasVehicleId
      ? vehicleId || null
      : current.vehicle_id || null;

  if (status && !ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: "Nieprawidłowy status rezerwacji." },
      { status: 400 }
    );
  }

  // Konflikty operacyjne: ten sam kierowca lub pojazd w oknie 3 godzin.
  if (effectiveDriverId || effectiveVehicleId) {
    const { data: sameDay } = await admin
      .from("bookings")
      .select("id,booking_number,travel_time,driver_id,vehicle_id")
      .eq("travel_date", current.travel_date)
      .neq("id", id)
      .not("status", "in", "(completed,cancelled)");

    const toMinutes = (value: string) => {
      const [h, m] = String(value || "00:00")
        .slice(0, 5)
        .split(":")
        .map(Number);
      return h * 60 + m;
    };

    const currentMinutes = toMinutes(current.travel_time);

    const conflict = (sameDay ?? []).find((row: any) => {
      const close =
        Math.abs(toMinutes(row.travel_time) - currentMinutes) < 180;

      return (
        close &&
        ((effectiveDriverId && row.driver_id === effectiveDriverId) ||
          (effectiveVehicleId && row.vehicle_id === effectiveVehicleId))
      );
    });

    if (conflict) {
      const driverConflict =
        effectiveDriverId && conflict.driver_id === effectiveDriverId;
      const vehicleConflict =
        effectiveVehicleId && conflict.vehicle_id === effectiveVehicleId;

      const what =
        driverConflict && vehicleConflict
          ? "kierowca i pojazd"
          : driverConflict
          ? "kierowca"
          : "pojazd";

      return NextResponse.json(
        {
          error:
            `Konflikt: ten ${what} jest już przypisany do ` +
            `${conflict.booking_number} o ${String(conflict.travel_time).slice(0,5)}. ` +
            `Sprawdź Plan kursów.`,
          conflict,
          conflict_type: what
        },
        { status: 409 }
      );
    }
  }

  // Automatyczny status po przydzieleniu pełnej obsady.
  if (
    effectiveDriverId &&
    effectiveVehicleId &&
    ["pending", "confirmed", "assigned"].includes(nextStatus)
  ) {
    nextStatus = "assigned";
  }

  const updateData: any = {
    status: nextStatus,
    updated_at: new Date().toISOString()
  };

  // Nie zeruj obsady przy akcjach, które zmieniają tylko status.
  if (hasDriverId) {
    updateData.driver_id =
      driverId || null;
  }

  if (hasVehicleId) {
    updateData.vehicle_id =
      vehicleId || null;
  }


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


  const calendarResult =
    await syncBookingCalendar(
      admin,
      updated
    );

  if (
    calendarResult.configured &&
    calendarResult.synced
  ) {
    await admin.from("booking_history").insert({
      booking_id: id,
      event:
        calendarResult.deleted
          ? "Google Calendar: usunięto wydarzenie"
          : "Google Calendar: zsynchronizowano kurs",
      created_by: user.id
    });
  }

  if (
    updated.driver_id &&
    (
      current.driver_id !== updated.driver_id ||
      resourcesChanged
    )
  ) {
    const routeText =
      updated.service_type === "from_airport"
        ? `${updated.airport_label} → ${updated.pickup_address}`
        : `${updated.pickup_address} → ${updated.airport_label}`;

    await sendDriverPush(
      admin,
      updated.driver_id,
      {
        title:
          current.driver_id !== updated.driver_id
            ? "🚐 NOWY KURS MATT"
            : "⚠ ZMIANA W TWOIM KURSIE",
        body:
          `${updated.travel_date} ${String(updated.travel_time).slice(0,5)} · ` +
          `${updated.customer_name} · ${routeText}`,
        url: "/kierowca",
        tag: `booking-${updated.id}`,
        bookingId: updated.id,
        eventKey:
          `assignment:${updated.id}:` +
          `${updated.driver_id}:` +
          `${updated.vehicle_id || "no-vehicle"}:` +
          `${updated.travel_date}:` +
          `${String(updated.travel_time).slice(0,5)}`
      }
    ).catch((error) => {
      console.error("Driver push:", error);
    });
  }

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
      const recipient =
        await recipientForBooking(
          admin,
          updated
        );

      const result = await sendMattEmail({
        to: recipient as any,
        subject: template.subject,
        html: template.html
      });

      emailSent = result.sent;
      emailError = result.error ?? null;

      await admin.from("booking_history").insert({
        booking_id: id,
        event: result.sent
          ? `Wysłano e-mail: ${template.subject}`
          : `BŁĄD e-mail: ${template.subject} · ${result.error || "nieznany błąd"}`,
        created_by: user.id
      });
    }
  } catch (mailError) {
    emailError =
      mailError instanceof Error
        ? mailError.message
        : "Nieznany błąd e-mail";
    console.error("E-mail statusu:", mailError);
  }


  let customerNotification: any = null;

  try {
    let notificationKind:
      | "confirmed"
      | "assigned"
      | "completed"
      | "cancelled"
      | null = null;

    if (statusChanged && nextStatus === "confirmed") {
      notificationKind = "confirmed";
    } else if (
      (statusChanged || resourcesChanged) &&
      nextStatus === "assigned" &&
      updated.driver_id &&
      updated.vehicle_id
    ) {
      notificationKind = "assigned";
    } else if (statusChanged && nextStatus === "completed") {
      notificationKind = "completed";
    } else if (statusChanged && nextStatus === "cancelled") {
      notificationKind = "cancelled";
    }

    if (notificationKind) {
      customerNotification = await sendBookingNotification(
        admin,
        updated,
        {
          kind: notificationKind,
          eventKey:
            `${notificationKind}:${updated.id}:` +
            `${updated.updated_at || Date.now()}`
        }
      );

      if (customerNotification?.sent) {
        await admin.from("booking_history").insert({
          booking_id: id,
          event: `Wysłano powiadomienie klienta: ${notificationKind} (${customerNotification.channel})`,
          created_by: user.id
        });
      }
    }
  } catch (notificationError) {
    console.error("Customer notification:", notificationError);
  }

  return NextResponse.json({
    ...updated,
    email_sent: emailSent,
    email_error: emailError,
    customer_notification_sent: Boolean(customerNotification?.sent),
    customer_notification_channel: customerNotification?.channel || null
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
