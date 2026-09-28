import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createDriverTerminalHandoff } from "@/lib/driverMobileAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Brak autoryzacji kierowcy." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: driver } = await admin
    .from("drivers")
    .select("id")
    .eq("user_id", user.id)
    .eq("active", true)
    .single();

  if (!driver) {
    return NextResponse.json({ error: "Aktywny kierowca nie został znaleziony." }, { status: 403 });
  }

  return NextResponse.json({
    handoffToken: createDriverTerminalHandoff(user.id),
    expiresIn: 600
  });
}
