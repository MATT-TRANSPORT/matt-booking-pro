import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const DOCUMENT_TYPES = ["invoice", "correction", "payment_confirmation", "other"];

async function access() {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return { error: "Brak autoryzacji.", status: 401 } as const;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "dispatcher", "accounting"].includes(profile.role)) {
    return { error: "Brak uprawnień do dokumentów rezerwacji.", status: 403 } as const;
  }

  return { admin, user } as const;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await access();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { admin, user } = auth;
  const { data: booking } = await admin
    .from("bookings")
    .select("id,booking_number,company_id")
    .eq("id", id)
    .single();

  if (!booking) {
    return NextResponse.json({ error: "Nie znaleziono rezerwacji." }, { status: 404 });
  }
  if (!booking.company_id) {
    return NextResponse.json(
      { error: "Dokumenty B2B można przypinać do rezerwacji firmowych." },
      { status: 400 }
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  const documentType = String(form.get("documentType") || "invoice");
  const documentNumber = String(form.get("documentNumber") || "").trim() || null;
  const visibleToCompany = String(form.get("visibleToCompany") || "true") !== "false";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Dodaj plik dokumentu." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Dozwolone formaty: PDF, JPG, PNG." },
      { status: 400 }
    );
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Plik może mieć maksymalnie 10 MB." }, { status: 400 });
  }
  if (!DOCUMENT_TYPES.includes(documentType)) {
    return NextResponse.json({ error: "Nieprawidłowy typ dokumentu." }, { status: 400 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${booking.company_id}/${booking.id}/${crypto.randomUUID()}-${safeName}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await admin.storage
    .from("booking-documents")
    .upload(path, bytes, {
      contentType: file.type,
      upsert: false
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: document, error } = await admin
    .from("booking_documents")
    .insert({
      booking_id: booking.id,
      company_id: booking.company_id,
      document_type: documentType,
      document_number: documentNumber,
      file_name: file.name,
      file_path: path,
      mime_type: file.type,
      file_size: file.size,
      visible_to_company: visibleToCompany,
      uploaded_by: user.id
    })
    .select("*")
    .single();

  if (error || !document) {
    await admin.storage.from("booking-documents").remove([path]);
    return NextResponse.json(
      { error: error?.message || "Nie udało się zapisać dokumentu." },
      { status: 500 }
    );
  }

  if (["invoice", "correction"].includes(documentType)) {
    await admin
      .from("bookings")
      .update({
        invoice_status: "invoiced",
        ...(documentNumber ? { invoice_number: documentNumber } : {})
      })
      .eq("id", booking.id);
  }

  await admin.from("booking_history").insert({
    booking_id: booking.id,
    event: `Dodano dokument: ${documentType}${documentNumber ? ` · ${documentNumber}` : ""} · ${file.name}`,
    created_by: user.id
  });

  return NextResponse.json({ ok: true, document });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await access();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { admin, user } = auth;
  const body = await req.json();
  const documentId = String(body.documentId || "");

  const { data: document } = await admin
    .from("booking_documents")
    .select("*")
    .eq("id", documentId)
    .eq("booking_id", id)
    .single();

  if (!document) {
    return NextResponse.json({ error: "Nie znaleziono dokumentu." }, { status: 404 });
  }

  const { error: storageError } = await admin.storage
    .from("booking-documents")
    .remove([document.file_path]);

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 });
  }

  const { error } = await admin
    .from("booking_documents")
    .delete()
    .eq("id", document.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.from("booking_history").insert({
    booking_id: id,
    event: `Usunięto dokument: ${document.document_number || document.file_name}`,
    created_by: user.id
  });

  return NextResponse.json({ ok: true });
}
