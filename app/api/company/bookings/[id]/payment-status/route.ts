import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });

  const { data: membership } = await auth
    .from("company_users")
    .select("company_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .single();

  if (!membership) return NextResponse.json({ error: "Brak dostępu do firmy." }, { status: 403 });

  const { data: booking } = await auth
    .from("bookings")
    .select("payment_status,payment_provider,payment_paid_at,payment_last_error")
    .eq("id", id)
    .eq("company_id", membership.company_id)
    .single();

  if (!booking) return NextResponse.json({ error: "Nie znaleziono rezerwacji." }, { status: 404 });
  return NextResponse.json({ booking });
}
