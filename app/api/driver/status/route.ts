import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// v3.6.0: stary endpoint pozostaje tylko jako bezpieczny bezpiecznik dla
// urządzeń z cache poprzedniej wersji. Nowy workflow wymaga informacji o
// etapie WYJAZD/POWRÓT i działa przez /api/driver/bookings/[id]/status.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });
  }

  return NextResponse.json(
    {
      error:
        "Panel kierowcy został zaktualizowany do DRIVER PRO. Odśwież aplikację, aby użyć nowego workflow statusów."
    },
    { status: 409 }
  );
}
