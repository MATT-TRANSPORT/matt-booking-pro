import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;
  const token = new URL(req.url).searchParams.get("token");
  const admin = createAdminClient();
  const { data: document } = await admin
    .from("company_booking_documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (!document) {
    return NextResponse.json({ error: "Nie znaleziono dokumentu." }, { status: 404 });
  }

  if (token) {
    const { data: booking } = await admin
      .from("bookings")
      .select("id,customer_access_token,company_id")
      .eq("id", document.booking_id)
      .eq("company_id", document.company_id)
      .maybeSingle();

    if (!booking?.customer_access_token || booking.customer_access_token !== token) {
      return NextResponse.json({ error: "Link do dokumentu jest nieprawidłowy." }, { status: 403 });
    }
  } else {
    const auth = await createClient();
    const { data: { user } } = await auth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });
    }

    const [{ data: profile }, { data: membership }] = await Promise.all([
      admin.from("profiles").select("role").eq("id", user.id).maybeSingle(),
      admin.from("company_users")
        .select("company_id,active")
        .eq("user_id", user.id)
        .eq("company_id", document.company_id)
        .eq("active", true)
        .maybeSingle()
    ]);

    const staffAccess = Boolean(profile && ["admin", "dispatcher", "accounting"].includes(profile.role));
    if (!staffAccess && !membership) {
      return NextResponse.json({ error: "Brak dostępu do dokumentu." }, { status: 403 });
    }
  }

  // The emailed URL is stable. Mint a fresh short-lived Storage URL only after
  // authorization, so the passenger can reuse the same link later.
  const { data: signed, error } = await admin.storage
    .from("company-booking-documents")
    .createSignedUrl(document.storage_path, 60, { download: document.original_name || true });

  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: error?.message || "Błąd generowania linku." }, { status: 500 });
  }

  const response = NextResponse.redirect(signed.signedUrl, 307);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}
