import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function panelClient() {
  const s = await createClient();

  const {
    data: { user }
  } = await s.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { s, user };
}
