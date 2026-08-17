import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  let next = url.searchParams.get("next") || "/ustaw-haslo";
  if (!next.startsWith("/")) next = "/ustaw-haslo";

  if (!code) {
    const target = new URL("/ustaw-haslo", url.origin);
    target.searchParams.set(
      "error",
      "Nie udało się potwierdzić linku. Poproś administratora o wysłanie nowego linku."
    );
    return NextResponse.redirect(target);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const target = new URL("/ustaw-haslo", url.origin);
    target.searchParams.set("error", "Link jest nieprawidłowy lub wygasł.");
    return NextResponse.redirect(target);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
