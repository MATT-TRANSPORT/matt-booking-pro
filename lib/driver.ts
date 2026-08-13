import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function driverClient() {
  const auth = await createClient();

  const {
    data: { user }
  } = await auth.auth.getUser();

  if (!user) {
    redirect("/kierowca/login");
  }

  const admin = createAdminClient();

  const { data: driver } = await admin
    .from("drivers")
    .select("*")
    .eq("user_id", user.id)
    .eq("active", true)
    .single();

  if (!driver) {
    redirect("/kierowca/brak-dostepu");
  }

  return {
    auth,
    admin,
    user,
    driver
  };
}
