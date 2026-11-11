import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function safeFilename(value: string) {
  return value.replace(/[\r\n"]/g, "_").replace(/[^\x20-\x7E]/g, "_");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;
  const token = req.nextUrl.searchParams.get("token");
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
    // Public passenger access is limited to the booking's existing, unguessable customer token.
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
  }

  const { data: file, error } = await admin.storage
    .from("company-booking-documents")
    .download(document.storage_path);

  if (error || !file) {
    return NextResponse.json({ error: error?.message || "Błąd pliku." }, { status: 500 });
  }

  const filename = String(document.original_name || "dokument");
  const disposition = `attachment; filename="${safeFilename(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`;

  return new NextResponse(file, {
    headers: {
      "Content-Type": document.mime_type || "application/octet-stream",
      "Content-Length": String(file.size),
      "Content-Disposition": disposition,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer"
    }
  });
}
