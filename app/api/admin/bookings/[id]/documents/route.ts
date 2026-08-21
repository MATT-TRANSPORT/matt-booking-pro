import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const ALLOWED_DOCUMENT_TYPES = ["invoice", "correction", "payment_confirmation", "other"];

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bookingId } = await params;
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "accounting"].includes(profile.role)) {
    return NextResponse.json({ error: "Brak uprawnień." }, { status: 403 });
  }

  const { data: booking } = await admin
    .from("bookings")
    .select("id,company_id,booking_number")
    .eq("id", bookingId)
    .single();

  if (!booking?.company_id) {
    return NextResponse.json(
      { error: "Dokumenty B2B można dodać tylko do rezerwacji firmowej." },
      { status: 400 }
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  const documentTypeRaw = String(form.get("documentType") || "invoice");
  const documentType = ALLOWED_DOCUMENT_TYPES.includes(documentTypeRaw)
    ? documentTypeRaw
    : "other";
  const documentNumber = String(form.get("documentNumber") || "").trim() || null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Wybierz plik." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Dozwolone formaty: PDF, JPG, PNG." },
      { status: 400 }
    );
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Plik może mieć maksymalnie 10 MB." },
      { status: 400 }
    );
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const documentId = crypto.randomUUID();
  const storagePath = `${booking.company_id}/${bookingId}/${documentId}-${safeName}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await admin.storage
    .from("company-booking-documents")
    .upload(storagePath, bytes, {
      contentType: file.type,
      upsert: false
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: document, error } = await admin
    .from("company_booking_documents")
    .insert({
      id: documentId,
      booking_id: bookingId,
      company_id: booking.company_id,
      document_type: documentType,
      document_number: documentNumber,
      original_name: file.name,
      storage_path: storagePath,
      mime_type: file.type,
      size_bytes: file.size,
      uploaded_by: user.id
    })
    .select("*")
    .single();

  if (error || !document) {
    await admin.storage.from("company-booking-documents").remove([storagePath]);
    return NextResponse.json({ error: error?.message || "Błąd zapisu dokumentu." }, { status: 500 });
  }

  if (documentType === "invoice") {
    await admin
      .from("bookings")
      .update({
        invoice_status: "invoiced",
        ...(documentNumber ? { invoice_number: documentNumber } : {})
      })
      .eq("id", bookingId);
  }

  await admin.from("booking_history").insert({
    booking_id: bookingId,
    event: `Dodano dokument B2B: ${documentType}${documentNumber ? ` · ${documentNumber}` : ""} · ${file.name}`,
    created_by: user.id
  });

  return NextResponse.json({ ok: true, document });
}
