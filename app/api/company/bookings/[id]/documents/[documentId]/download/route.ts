import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const { id, documentId } = await params;
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });
  }

  const { data: membership } = await auth
    .from("company_users")
    .select("company_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Brak firmy." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: document } = await admin
    .from("booking_documents")
    .select("file_path")
    .eq("id", documentId)
    .eq("booking_id", id)
    .eq("company_id", membership.company_id)
    .eq("visible_to_company", true)
    .single();

  if (!document?.file_path) {
    return NextResponse.json({ error: "Dokument nie jest dostępny." }, { status: 404 });
  }

  const { data, error } = await admin.storage
    .from("booking-documents")
    .createSignedUrl(document.file_path, 60);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message || "Błąd pliku." }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
