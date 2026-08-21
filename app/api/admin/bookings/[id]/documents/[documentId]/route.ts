import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const { id: bookingId, documentId } = await params;
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

  const { data: document } = await admin
    .from("company_booking_documents")
    .select("*")
    .eq("id", documentId)
    .eq("booking_id", bookingId)
    .single();

  if (!document) {
    return NextResponse.json({ error: "Nie znaleziono dokumentu." }, { status: 404 });
  }

  const { error: removeError } = await admin.storage
    .from("company-booking-documents")
    .remove([document.storage_path]);

  if (removeError) {
    return NextResponse.json({ error: removeError.message }, { status: 500 });
  }

  const { error } = await admin
    .from("company_booking_documents")
    .delete()
    .eq("id", documentId)
    .eq("booking_id", bookingId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (document.document_type === "invoice") {
    const { count } = await admin
      .from("company_booking_documents")
      .select("id", { count: "exact", head: true })
      .eq("booking_id", bookingId)
      .eq("document_type", "invoice");

    if (!count) {
      await admin
        .from("bookings")
        .update({ invoice_status: "not_invoiced", invoice_number: null })
        .eq("id", bookingId);
    }
  }

  await admin.from("booking_history").insert({
    booking_id: bookingId,
    event: `Usunięto dokument B2B: ${document.original_name}`,
    created_by: user.id
  });

  return NextResponse.json({ ok: true });
}
