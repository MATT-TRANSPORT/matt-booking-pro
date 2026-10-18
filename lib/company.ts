import { withCustomerLocale } from "@/lib/bookingLocale";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function companyClient(locale:unknown="pl") {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect(withCustomerLocale("/firma/login",locale));

  const { data: membership } = await s
    .from("company_users")
    .select("id,role,company_id,created_at,companies(id,name,nip,email,phone,contact_person,payment_days,discount_percent,active)")
    .eq("user_id", user.id)
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) redirect(withCustomerLocale("/firma/brak-dostepu",locale));

  const company = Array.isArray(membership.companies)
    ? membership.companies[0]
    : membership.companies;

  return { s, user, membership, company };
}
