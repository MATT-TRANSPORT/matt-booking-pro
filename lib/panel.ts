import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function panelClient() {
  const auth = await createClient();

  const {
    data: { user }
  } = await auth.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id,full_name,role,phone")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "dispatcher", "accounting"].includes(profile.role)) {
    redirect("/login");
  }

  return {
    s: admin,
    user,
    profile
  };
}
