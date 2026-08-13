import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMattEmail } from "@/lib/email";

const ALLOWED = [
  "assigned",
  "in_progress",
  "arrived",
  "picked_up",
  "completed"
];

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
    return NextResponse.json(
      { error: "Brak autoryzacji." },
      { status: 401 }
    );
  }

  const admin = createAdminClient();

  const { data: driver } = await admin
    .from("drivers")
    .select("*")
    .eq("user_id", user.id)
    .eq("active", true)
    .single();

  if (!driver) {
    return NextResponse.json(
      { error: "Brak profilu kierowcy." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const status = String(body.status || "");

  if (!ALLOWED.includes(status)) {
    return NextResponse.json(
      { error: "Nieprawidłowy status." },
      { status: 400 }
    );
  }

  const { data: booking } = await admin
    .from("bookings")
    .select("*")
    .eq("id", id)
    .eq("driver_id", driver.id)
    .single();

  if (!booking) {
    return NextResponse.json(
      { error: "Ten kurs nie jest przypisany do Ciebie." },
      { status: 403 }
    );
  }

  const { data: updated, error } = await admin
    .from("bookings")
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  const labels: Record<string, string> = {
    assigned: "Kierowca przypisany",
    in_progress: "Kierowca w drodze",
    arrived: "Kierowca na miejscu",
    picked_up: "Pasażer odebrany",
    completed: "Kurs zakończony"
  };

  await admin.from("booking_history").insert({
    booking_id: id,
    event: `Kierowca ${driver.full_name}: ${labels[status] ?? status}`,
    created_by: user.id
  });

  // Powiadomienie klienta tylko dla kluczowych statusów.
  if (booking.email && ["in_progress", "arrived", "completed"].includes(status)) {
    let subject = "";
    let bodyText = "";

    if (status === "in_progress") {
      subject = `Kierowca wyruszył – ${booking.booking_number}`;
      bodyText = `Twój kierowca ${driver.full_name} wyruszył na realizację przejazdu.`;
    } else if (status === "arrived") {
      subject = `Kierowca jest na miejscu – ${booking.booking_number}`;
      bodyText = `Twój kierowca ${driver.full_name} jest już na miejscu odbioru.`;
    } else {
      subject = `Dziękujemy za przejazd – ${booking.booking_number}`;
      bodyText = `Kurs został zakończony. Dziękujemy za podróż z MATT TRANSPORT.`;
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

  return NextResponse.json(updated);
}
