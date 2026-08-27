import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMattEmail } from "@/lib/email";
import { syncBookingCalendar } from "@/lib/googleCalendar";
import { sendBookingNotification } from "@/lib/customerNotifications";
import {
  DriverLeg,
  DriverStep,
  currentDriverLeg,
  driverEventText,
  driverProgressFromHistory,
  driverTransitionAllowed
} from "@/lib/driverOps";

const ALLOWED: DriverStep[] = [
  "in_progress",
  "arrived",
  "picked_up",
  "completed"
];

const HUMAN_LABELS: Record<DriverStep, string> = {
  assigned: "Kierowca przypisany",
  in_progress: "Kierowca w drodze",
  arrived: "Kierowca na miejscu",
  picked_up: "Pasażer odebrany",
  completed: "Kurs zakończony"
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const auth = await createClient();
  const {
    data: { user }
  } = await auth.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: driver } = await admin
    .from("drivers")
    .select("*")
    .eq("user_id", user.id)
    .eq("active", true)
    .single();

  if (!driver) {
    return NextResponse.json({ error: "Brak profilu kierowcy." }, { status: 403 });
  }

  const body = await req.json();
  const status = String(body.status || "") as DriverStep;
  const requestedLeg: DriverLeg = body.leg === "return" ? "return" : "primary";

  if (!ALLOWED.includes(status)) {
    return NextResponse.json({ error: "Nieprawidłowy status." }, { status: 400 });
  }

  const { data: booking } = await admin
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single();

  if (!booking) {
    return NextResponse.json(
      { error: "Nie znaleziono kursu." },
      { status: 404 }
    );
  }

  const assignedDriverId = requestedLeg === "return" ? booking.return_driver_id : booking.driver_id;
  const assignedVehicleId = requestedLeg === "return" ? booking.return_vehicle_id : booking.vehicle_id;

  if (String(assignedDriverId || "") !== String(driver.id)) {
    return NextResponse.json(
      { error: requestedLeg === "return" ? "Kurs POWROTNY nie jest przypisany do Ciebie." : "Kurs WYJAZDOWY nie jest przypisany do Ciebie." },
      { status: 403 }
    );
  }

  if (booking.status === "cancelled") {
    return NextResponse.json({ error: "Ten kurs został anulowany." }, { status: 409 });
  }

  if (booking.status === "completed") {
    return NextResponse.json({ error: "Ten kurs jest już zakończony." }, { status: 409 });
  }

  const { data: history } = await admin
    .from("booking_history")
    .select("event,created_at")
    .eq("booking_id", id)
    .order("created_at", { ascending: true });

  const progress = driverProgressFromHistory(history ?? []);
  const expectedLeg = currentDriverLeg(booking, progress);

  if (booking.service_type !== "roundtrip" && requestedLeg === "return") {
    return NextResponse.json({ error: "Ta rezerwacja nie ma kursu powrotnego." }, { status: 409 });
  }

  if (requestedLeg !== expectedLeg) {
    return NextResponse.json(
      {
        error:
          expectedLeg === "return"
            ? "Wyjazd jest już zakończony. Aktualnym etapem jest POWRÓT."
            : "Najpierw zakończ WYJAZD. Dopiero potem można rozpocząć POWRÓT."
      },
      { status: 409 }
    );
  }

  if (status === "in_progress" && !assignedVehicleId) {
    return NextResponse.json(
      { error: "Nie można rozpocząć kursu bez przypisanego pojazdu." },
      { status: 409 }
    );
  }

  if (!driverTransitionAllowed(booking.status, status)) {
    const currentLabel = HUMAN_LABELS[booking.status as DriverStep] || booking.status;
    return NextResponse.json(
      {
        error:
          `Nie można pominąć etapu. Aktualny status: ${currentLabel}. ` +
          "Zmieniaj statusy po kolei z poziomu MATT DRIVER."
      },
      { status: 409 }
    );
  }

  const stepAt = new Date().toISOString();
  const isRoundtripPrimaryCompleted =
    booking.service_type === "roundtrip" &&
    requestedLeg === "primary" &&
    status === "completed";

  // Po zakończeniu pierwszej nogi roundtrip rezerwacja nadal jest aktywna.
  // Globalny status wraca do assigned, a fakt zakończenia WYJAZDU zapisujemy
  // w booking_history. Dopiero zakończenie POWROTU ustawia completed.
  const persistedStatus = isRoundtripPrimaryCompleted ? "assigned" : status;

  const bookingPatch: any = {
    status: persistedStatus,
    updated_at: stepAt
  };

  if (status === "completed" && !isRoundtripPrimaryCompleted) {
    bookingPatch.completed_at = stepAt;
  }

  const { data: updated, error } = await admin
    .from("bookings")
    .update(bookingPatch)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { error: error?.message || "Nie udało się zapisać statusu." },
      { status: 500 }
    );
  }

  await admin.from("booking_history").insert({
    booking_id: id,
    event: driverEventText(requestedLeg, status, driver.full_name),
    created_by: user.id,
    created_at: stepAt
  });

  if (isRoundtripPrimaryCompleted) {
    await admin.from("booking_history").insert({
      booking_id: id,
      event: "Wyjazd zakończony — rezerwacja pozostaje aktywna do kursu powrotnego.",
      created_by: user.id,
      created_at: stepAt
    });
  }

  await syncBookingCalendar(admin, updated);

  const shouldSendCompleted = status === "completed" && !isRoundtripPrimaryCompleted;
  const customerRelevant = ["in_progress", "arrived"].includes(status) || shouldSendCompleted;

  if (booking.email && customerRelevant) {
    const legText = requestedLeg === "return" ? " kurs powrotny" : "";
    let subject = "";
    let bodyText = "";

    if (status === "in_progress") {
      subject = `Kierowca wyruszył${legText} – ${booking.booking_number}`;
      bodyText = `Twój kierowca ${driver.full_name} wyruszył na realizację${legText || " przejazdu"}.`;
    } else if (status === "arrived") {
      subject = `Kierowca jest na miejscu – ${booking.booking_number}`;
      bodyText = `Twój kierowca ${driver.full_name} jest już na miejscu odbioru${requestedLeg === "return" ? " na kurs powrotny" : ""}.`;
    } else {
      subject = `Dziękujemy za przejazd – ${booking.booking_number}`;
      bodyText = "Kurs został zakończony. Dziękujemy za podróż z MATT TRANSPORT.";
    }

    await sendMattEmail({
      to: booking.email,
      subject,
      html: `
        <div style="font-family:Arial,sans-serif;background:#0b0e13;color:#fff;padding:28px">
          <div style="max-width:650px;margin:auto;background:#151923;border:1px solid #343b49;border-radius:16px;padding:28px">
            <h2 style="color:#f1d28b">MATT TRANSPORT</h2>
            <h1>${subject}</h1>
            <p>${bodyText}</p>
            <p>Numer rezerwacji: <strong>${booking.booking_number}</strong></p>
            <p>Kontakt: +48 691 242 691</p>
          </div>
        </div>
      `
    }).catch(() => null);
  }

  if (customerRelevant) {
    await sendBookingNotification(
      admin,
      updated,
      {
        kind:
          status === "in_progress"
            ? "in_progress"
            : status === "arrived"
            ? "arrived"
            : "completed",
        eventKey: `driver-status:${requestedLeg}:${status}:${updated.id}:${stepAt}`,
        driver
      }
    ).catch((notificationError) => {
      console.error("Customer status notification:", notificationError);
    });
  }

  return NextResponse.json({
    ...updated,
    status: persistedStatus,
    step_status: status,
    step_at: stepAt,
    leg: requestedLeg,
    roundtrip_waiting_return: isRoundtripPrimaryCompleted
  });
}
