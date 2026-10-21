import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const reply = (body: object, status: number) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
  if (req.headers.get("sec-fetch-site") === "cross-site") return reply({ error: "Niedozwolone żądanie." }, 403);
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return reply({ error: "Zaloguj się ponownie." }, 401);
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "dispatcher", "accounting"].includes(profile.role)) return reply({ error: "Brak uprawnień." }, 403);
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return reply({ error: "Nieprawidłowa rezerwacja." }, 400);
  const { data: booking, error: bookingError } = await admin.from("bookings").select("id").eq("id", id).maybeSingle();
  if (bookingError) return reply({ error: "Nie udało się odczytać rezerwacji." }, 503);
  if (!booking) return reply({ error: "Nie znaleziono rezerwacji." }, 404);
  // Ignore duplicates: preserve the first read timestamp, including simultaneous tabs.
  const { error } = await admin.from("panel_booking_reads").upsert({ user_id: user.id, booking_id: id }, { onConflict: "user_id,booking_id", ignoreDuplicates: true });
  if (error) return reply({ error: "Nie udało się zapisać odczytania." }, 503);
  return reply({ ok: true }, 200);
}
