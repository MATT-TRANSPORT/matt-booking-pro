import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const { data: settlement } = await admin
    .from("company_settlements")
    .select("*")
    .eq("id", id)
    .eq("company_id", membership.company_id)
    .single();

  if (!settlement?.invoice_file_path) {
    return NextResponse.json({ error: "Brak pliku faktury." }, { status: 404 });
  }

  const { data, error } = await admin.storage
    .from("company-invoices")
    .createSignedUrl(settlement.invoice_file_path, 60);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? "Błąd pliku." }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
