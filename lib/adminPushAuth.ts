import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PANEL_ROLES = new Set(["admin", "dispatcher", "accounting"]);

export class AdminPushAuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminPushAuthError";
    this.status = status;
  }
}

export async function adminPushClient() {
  const auth = await createClient();
  const {
    data: { user }
  } = await auth.auth.getUser();

  if (!user) {
    throw new AdminPushAuthError("Brak autoryzacji.", 401);
  }

  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("id,full_name,role")
    .eq("id", user.id)
    .single();

  if (error || !profile || !PANEL_ROLES.has(String(profile.role))) {
    throw new AdminPushAuthError("Brak dostępu do panelu.", 403);
  }

  return { admin, user, profile };
}
