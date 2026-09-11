import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAdminPush } from "@/lib/pushServer";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });

  const admin = createAdminClient();
  const { data: driver } = await admin.from("drivers").select("id,full_name").eq("user_id", user.id).eq("active", true).maybeSingle();
  if (!driver) return NextResponse.json({ error: "Brak profilu kierowcy." }, { status: 403 });

  const form = await req.formData();
  const bookingId = String(form.get("bookingId") || "");
  const issueType = String(form.get("issueType") || "other").slice(0, 40);
  const description = String(form.get("description") || "").trim().slice(0, 2000);
  const mileageRaw = String(form.get("mileage") || "").trim();
  const mileage = mileageRaw ? Math.max(0, Math.round(Number(mileageRaw))) : null;
  const photo = form.get("photo");

  if (!bookingId) return NextResponse.json({ error: "Wybierz kurs." }, { status: 400 });
  if (!description && mileage === null) return NextResponse.json({ error: "Dodaj opis albo przebieg." }, { status: 400 });

  const { data: booking } = await admin.from("bookings")
    .select("id,booking_number,driver_id,return_driver_id,vehicle_id,return_vehicle_id")
    .eq("id", bookingId).maybeSingle();
  if (!booking) return NextResponse.json({ error: "Nie znaleziono kursu." }, { status: 404 });

  const primary = String(booking.driver_id || "") === String(driver.id);
  const returned = String(booking.return_driver_id || "") === String(driver.id);
  if (!primary && !returned) return NextResponse.json({ error: "Ten kurs nie jest przypisany do Ciebie." }, { status: 403 });
  const vehicleId = returned && !primary ? booking.return_vehicle_id : booking.vehicle_id || booking.return_vehicle_id;
  if (!vehicleId) return NextResponse.json({ error: "Kurs nie ma przypisanego pojazdu." }, { status: 409 });

  let photoPath: string | null = null;
  if (photo instanceof File && photo.size > 0) {
    if (!photo.type.startsWith("image/")) return NextResponse.json({ error: "Zdjęcie musi być plikiem graficznym." }, { status: 400 });
    if (photo.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Zdjęcie może mieć maks. 5 MB." }, { status: 400 });
    const safeExt = (photo.name.split(".").pop() || "jpg").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "jpg";
    photoPath = `${driver.id}/${Date.now()}-${crypto.randomUUID()}.${safeExt}`;
    const bytes = new Uint8Array(await photo.arrayBuffer());
    const { error: uploadError } = await admin.storage.from("driver-issues").upload(photoPath, bytes, { contentType: photo.type, upsert: false });
    if (uploadError) return NextResponse.json({ error: `Nie udało się zapisać zdjęcia: ${uploadError.message}` }, { status: 500 });
  }

  const { data: report, error } = await admin.from("driver_issue_reports").insert({
    driver_id: driver.id,
    booking_id: booking.id,
    vehicle_id: vehicleId,
    issue_type: issueType,
    description: description || (mileage !== null ? `Aktualizacja przebiegu: ${mileage} km` : "Zgłoszenie kierowcy"),
    mileage,
    photo_path: photoPath,
    status: "open"
  }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (mileage !== null) {
    const { data: vehicle } = await admin.from("vehicles").select("mileage").eq("id", vehicleId).maybeSingle();
    if (!vehicle?.mileage || mileage > Number(vehicle.mileage)) {
      await admin.from("vehicles").update({ mileage }).eq("id", vehicleId);
    }
  }

  await sendAdminPush(admin, {
    title: issueType === "mileage" ? "🚐 PRZEBIEG POJAZDU" : "⚠ ZGŁOSZENIE KIEROWCY",
    body: `${driver.full_name} · ${booking.booking_number} · ${description || `${mileage} km`}`.slice(0, 180),
    url: "/panel/zgloszenia",
    tag: `driver-issue-${report.id}`
  }).catch((err) => console.error("Driver issue admin push:", err));

  return NextResponse.json({ ok: true, report });
}
