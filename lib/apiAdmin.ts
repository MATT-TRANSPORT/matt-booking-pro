import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function apiAdmin() {
  const auth = await createClient();

  const {
    data: { user }
  } = await auth.auth.getUser();

  if (!user) {
    return { error: "Brak autoryzacji.", status: 401 as const };
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    !["admin", "dispatcher"].includes(profile.role)
  ) {
    return { error: "Brak uprawnień.", status: 403 as const };
  }

  return { admin, user, profile };
}
