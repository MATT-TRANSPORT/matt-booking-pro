import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function companyClient() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/firma/login");

  const { data: membership } = await s
    .from("company_users")
    .select("id,role,company_id,created_at,companies(id,name,nip,email,phone,contact_person,payment_days,discount_percent,active)")
    .eq("user_id", user.id)
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/firma/brak-dostepu");

  const company = Array.isArray(membership.companies)
    ? membership.companies[0]
    : membership.companies;

  return { s, user, membership, company };
}
