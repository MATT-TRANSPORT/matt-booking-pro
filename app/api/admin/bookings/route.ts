import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMattEmail } from "@/lib/email";
import { sendDriverPush } from "@/lib/pushServer";
import { syncBookingCalendar } from "@/lib/googleCalendar";
import { sendBookingNotification } from "@/lib/customerNotifications";
import { bookingLegs, findResourceConflicts } from "@/lib/dispatcherOps";
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

  const requestedLeg =
    requestBody.leg === "return"
      ? "return"
      : requestBody.leg === "primary"
      ? "primary"
      : null;

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

  const hasReturnDriverId = Object.prototype.hasOwnProperty.call(requestBody, "returnDriverId");
  const hasReturnVehicleId = Object.prototype.hasOwnProperty.call(requestBody, "returnVehicleId");
  const returnDriverId = hasReturnDriverId ? requestBody.returnDriverId : undefined;
  const returnVehicleId = hasReturnVehicleId ? requestBody.returnVehicleId : undefined;

  if (!id) {
    return NextResponse.json(
      { error: "Brak identyfikatora rezerwacji." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "dispatcher"].includes(profile.role)) {
    return NextResponse.json(
      { error: "Brak uprawnień." },
      { status: 403 }
    );
  }

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
    if ("return_driver_id" in copy) copy.return_driver_id = null;
    if ("return_vehicle_id" in copy) copy.return_vehicle_id = null;
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
    if ("completed_at" in copy) copy.completed_at = null;
    if ("review_request_started_at" in copy) copy.review_request_started_at = null;
    if ("review_request_sent_at" in copy) copy.review_request_sent_at = null;
    if ("review_request_email_sent_at" in copy) copy.review_request_email_sent_at = null;
    if ("review_request_push_sent_at" in copy) copy.review_request_push_sent_at = null;

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

  const isRoundtripPrimaryCompletion =
    status === "completed" &&
    current.service_type === "roundtrip" &&
    requestedLeg === "primary";

  // Dispatcher może domknąć sam WYJAZD roundtrip bez zamykania całej rezerwacji.
  // Globalny status wraca do assigned; POWRÓT pozostaje aktywny.
  if (isRoundtripPrimaryCompletion) {
    nextStatus = "assigned";
  }

  const effectiveDriverId =
    hasDriverId
      ? driverId || null
      : current.driver_id || null;

  const effectiveVehicleId =
    hasVehicleId
      ? vehicleId || null
      : current.vehicle_id || null;

  const effectiveReturnDriverId =
    hasReturnDriverId ? returnDriverId || null : current.return_driver_id || null;

  const effectiveReturnVehicleId =
    hasReturnVehicleId ? returnVehicleId || null : current.return_vehicle_id || null;

  if (status && !ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: "Nieprawidłowy status rezerwacji." },
      { status: 400 }
    );
  }

  // Konflikty operacyjne v3.5: sprawdzamy oba etapy roundtrip.
  if (effectiveDriverId || effectiveVehicleId || effectiveReturnDriverId || effectiveReturnVehicleId) {
    const candidate = {
      ...current,
      driver_id: effectiveDriverId,
      vehicle_id: effectiveVehicleId,
      return_driver_id: effectiveReturnDriverId,
      return_vehicle_id: effectiveReturnVehicleId,
      status: nextStatus
    };

    const operationDates = Array.from(
      new Set(
        bookingLegs(candidate)
          .flatMap((leg) => [leg.date, leg.operationalStartDate, leg.operationalEndDate])
          .filter(Boolean)
      )
    );

    if (operationDates.length) {
      const selection =
        "id,booking_number,travel_date,travel_time,return_date,return_time,service_type,driver_id,vehicle_id,return_driver_id,return_vehicle_id,status";

      const [primaryResult, returnResult] = await Promise.all([
        admin
          .from("bookings")
          .select(selection)
          .in("travel_date", operationDates)
          .neq("id", id)
          .not("status", "in", "(completed,cancelled)"),
        admin
          .from("bookings")
          .select(selection)
          .in("return_date", operationDates)
          .neq("id", id)
          .not("status", "in", "(completed,cancelled)")
      ]);

      const nearby = new Map<string, any>();
      for (const row of [...(primaryResult.data ?? []), ...(returnResult.data ?? [])]) {
        nearby.set(row.id, row);
      }

      const conflicts = findResourceConflicts([candidate, ...nearby.values()]).filter(
        (conflict) => conflict.bookingId === id || conflict.otherBookingId === id
      );

      if (conflicts.length) {
        const first = conflicts[0];
        const targetIsFirst = first.bookingId === id;
        const otherNumber = targetIsFirst ? first.otherBookingNumber : first.bookingNumber;
        const resourceLabel = first.resource === "driver" ? "kierowca" : "pojazd";
        const legLabel = targetIsFirst ? first.leg : first.otherLeg;
        const otherLegLabel = targetIsFirst ? first.otherLeg : first.leg;

        return NextResponse.json(
          {
            error:
              `Konflikt: ten ${resourceLabel} koliduje z ${otherNumber}. ` +
              `${legLabel === "return" ? "Powrót" : "Wyjazd"} i ` +
              `${otherLegLabel === "return" ? "powrót" : "wyjazd"} mają nakładające się okna zajętości ` +
              `(${first.overlapMinutes} min). Zmień kierowcę, pojazd albo termin.`,
            conflicts
          },
          { status: 409 }
        );
      }
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

  const statusChangedAt = new Date().toISOString();
  const updateData: any = {
    status: nextStatus,
    updated_at: statusChangedAt
  };

  if (nextStatus === "completed" && current.status !== "completed") {
    updateData.completed_at = statusChangedAt;
  } else if (current.status === "completed" && nextStatus !== "completed") {
    updateData.completed_at = null;
  }

  // Nie zeruj obsady przy akcjach, które zmieniają tylko status.
  if (hasDriverId) {
    updateData.driver_id =
      driverId || null;
  }

  if (hasVehicleId) {
    updateData.vehicle_id =
      vehicleId || null;
  }

  if (hasReturnDriverId) {
    updateData.return_driver_id = returnDriverId || null;
  }

  if (hasReturnVehicleId) {
    updateData.return_vehicle_id = returnVehicleId || null;
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
  const primaryResourcesChanged =
    current.driver_id !== effectiveDriverId ||
    current.vehicle_id !== effectiveVehicleId;
  const returnResourcesChanged =
    current.return_driver_id !== effectiveReturnDriverId ||
    current.return_vehicle_id !== effectiveReturnVehicleId;
  const resourcesChanged = primaryResourcesChanged || returnResourcesChanged;

  await admin.from("booking_history").insert({
    booking_id: id,
    event: `Aktualizacja: status ${nextStatus}${
      resourcesChanged ? ", zmieniono obsadę WYJAZD/POWRÓT" : ""
    }`,
    created_by: user.id
  });

  if (isRoundtripPrimaryCompletion) {
    await admin.from("booking_history").insert({
      booking_id: id,
      event: "MATT DRIVER · WYJAZD · ZAKOŃCZONY · Dyspozytor MATT",
      created_by: user.id
    });
  }


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
      primaryResourcesChanged
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
        url: `/kierowca?booking=${updated.id}`,
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

  if (
    updated.service_type === "roundtrip" &&
    updated.return_driver_id &&
    (current.return_driver_id !== updated.return_driver_id || current.return_vehicle_id !== updated.return_vehicle_id)
  ) {
    await sendDriverPush(
      admin,
      updated.return_driver_id,
      {
        title: current.return_driver_id !== updated.return_driver_id ? "↩ NOWY KURS POWROTNY MATT" : "⚠ ZMIANA KURSU POWROTNEGO",
        body:
          `${updated.return_date} ${String(updated.return_time || "").slice(0,5)} · ` +
          `${updated.customer_name} · ${updated.airport_label} → ${updated.pickup_address}`,
        url: `/kierowca?booking=${updated.id}`,
        tag: `booking-${updated.id}-return`,
        bookingId: updated.id,
        eventKey:
          `return-assignment:${updated.id}:` +
          `${updated.return_driver_id}:` +
          `${updated.return_vehicle_id || "no-vehicle"}:` +
          `${updated.return_date}:` +
          `${String(updated.return_time || "").slice(0,5)}`
      }
    ).catch((error) => console.error("Return driver push:", error));
  }

  let emailSent = false;
  let emailError: string | null = null;

  try {
    const enriched = await enrichBooking(admin, updated);
    let template: ReturnType<typeof confirmedEmail> | null = null;

    if (statusChanged && nextStatus === "confirmed") {
      template = confirmedEmail(enriched);
    } else if (
      !isRoundtripPrimaryCompletion &&
      (
        statusChanged ||
        primaryResourcesChanged ||
        (returnResourcesChanged && updated.return_driver_id && updated.return_vehicle_id)
      ) &&
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
      !isRoundtripPrimaryCompletion &&
      (statusChanged || primaryResourcesChanged) &&
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
  let returnDriver = null;
  let returnVehicle = null;

  if (booking.driver_id) {
    const { data } = await admin
      .from("drivers")
      .select("full_name,phone")
      .eq("id", booking.driver_id)
      .maybeSingle();
    driver = data;
  }

  if (booking.vehicle_id) {
    const { data } = await admin
      .from("vehicles")
      .select("name,registration")
      .eq("id", booking.vehicle_id)
      .maybeSingle();
    vehicle = data;
  }

  if (booking.return_driver_id) {
    const { data } = await admin
      .from("drivers")
      .select("full_name,phone")
      .eq("id", booking.return_driver_id)
      .maybeSingle();
    returnDriver = data;
  }

  if (booking.return_vehicle_id) {
    const { data } = await admin
      .from("vehicles")
      .select("name,registration")
      .eq("id", booking.return_vehicle_id)
      .maybeSingle();
    returnVehicle = data;
  }

  return {
    ...booking,
    driver_name: driver?.full_name ?? null,
    driver_phone: driver?.phone ?? null,
    vehicle_name: vehicle?.name ?? null,
    vehicle_registration: vehicle?.registration ?? null,
    return_driver_name: returnDriver?.full_name ?? null,
    return_driver_phone: returnDriver?.phone ?? null,
    return_vehicle_name: returnVehicle?.name ?? null,
    return_vehicle_registration: returnVehicle?.registration ?? null
  };
}
