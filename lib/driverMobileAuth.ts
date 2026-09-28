import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function driverFromBearerRequest(req: NextRequest) {
  const authorization = req.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\\s+(.+)$/i);

  if (!match?.[1]) {
    return null;
  }

  const admin = createAdminClient();

  const {
    data: { user },
    error: authError
  } = await admin.auth.getUser(match[1]);

  if (authError || !user) {
    return null;
  }

  const { data: driver, error: driverError } = await admin
    .from("drivers")
    .select("*")
    .eq("user_id", user.id)
    .eq("active", true)
    .single();

  if (driverError || !driver) {
    return null;
  }

  return { admin, user, driver };
}
