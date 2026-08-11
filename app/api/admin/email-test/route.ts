import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMattEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Brak uprawnień." }, { status: 403 });
  }

  const { to } = await req.json();
  const target = to || "kontakt@matt-transport.pl";

  const result = await sendMattEmail({
    to: target,
    subject: "Test MATT Booking PRO",
    html: `
      <div style="font-family:Arial,sans-serif">
        <h2>MATT TRANSPORT</h2>
        <p>Wysyłka e-mail z MATT Booking PRO działa poprawnie.</p>
      </div>
    `
  });

  if (!result.sent) {
    return NextResponse.json(
      { error: result.error ?? "E-mail nie został wysłany.", skipped: result.skipped },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, id: result.id });
}
