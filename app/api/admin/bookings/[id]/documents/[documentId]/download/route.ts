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

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "dispatcher", "accounting"].includes(profile.role)) {
    return NextResponse.json({ error: "Brak uprawnień." }, { status: 403 });
  }

  const { data: document } = await admin
    .from("booking_documents")
    .select("file_path")
    .eq("id", documentId)
    .eq("booking_id", id)
    .single();

  if (!document?.file_path) {
    return NextResponse.json({ error: "Brak pliku." }, { status: 404 });
  }

  const { data, error } = await admin.storage
    .from("booking-documents")
    .createSignedUrl(document.file_path, 60);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message || "Błąd pliku." }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
