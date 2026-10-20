import { customerJson, requestCustomerLocale } from "@/lib/customerErrors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let responseLocale=requestCustomerLocale(_req);
  const json=(payload:any,init?:ResponseInit)=>customerJson(responseLocale,payload,init);
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return json({ error: "Nieprawidłowe dane formularza." }, { status: 400 });
  }
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();

  if (!user) {
    return json({ error: "Brak autoryzacji." }, { status: 401 });
  }

  const { data: membership } = await auth
    .from("company_users")
    .select("company_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .single();

  if (!membership) {
    return json({ error: "Brak firmy." }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: settlement } = await admin
    .from("company_settlements")
    .select("*")
    .eq("id", id)
    .eq("company_id", membership.company_id)
    .single();

  if (!settlement?.invoice_file_path) {
    return json({ error: "Brak pliku faktury." }, { status: 404 });
  }

  const { data, error } = await admin.storage
    .from("company-invoices")
    .createSignedUrl(settlement.invoice_file_path, 60);

  if (error || !data?.signedUrl) {
    return json({ error: error?.message ?? "Błąd pliku." }, { status: 500 });
  }

  const redirect = NextResponse.redirect(data.signedUrl);
  redirect.headers.set("Cache-Control", "private, no-store");
  redirect.headers.set("Referrer-Policy", "no-referrer");
  return redirect;
}
