import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: document } = await admin
    .from("company_booking_documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (!document) {
    return NextResponse.json({ error: "Nie znaleziono dokumentu." }, { status: 404 });
  }

  const [{ data: profile }, { data: membership }] = await Promise.all([
    admin.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    admin
      .from("company_users")
      .select("company_id,active")
      .eq("user_id", user.id)
      .eq("company_id", document.company_id)
      .eq("active", true)
      .maybeSingle()
  ]);

  const staffAccess = Boolean(
    profile && ["admin", "dispatcher", "accounting"].includes(profile.role)
  );
  const companyAccess = Boolean(membership);

  if (!staffAccess && !companyAccess) {
    return NextResponse.json({ error: "Brak dostępu do dokumentu." }, { status: 403 });
  }

  const { data, error } = await admin.storage
    .from("company-booking-documents")
    .createSignedUrl(document.storage_path, 120);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message || "Błąd pliku." }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
