import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_TYPES = new Set([
  "invite",
  "recovery",
  "signup",
  "email",
  "magiclink",
  "email_change"
]);

export async function GET(request: NextRequest) {
  const tokenHash =
    request.nextUrl.searchParams.get("token_hash");

  const rawType =
    request.nextUrl.searchParams.get("type");

  let next =
    request.nextUrl.searchParams.get("next") ||
    "/ustaw-haslo";

  if (!next.startsWith("/")) {
    next = "/ustaw-haslo";
  }

  if (
    !tokenHash ||
    !rawType ||
    !ALLOWED_TYPES.has(rawType)
  ) {
    const target = new URL(
      "/ustaw-haslo",
      request.url
    );

    target.searchParams.set(
      "error",
      "Nieprawidłowy link aktywacyjny. Poproś administratora o wysłanie nowego linku."
    );

    return NextResponse.redirect(target);
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: rawType as EmailOtpType
  });

  if (error) {
    console.error(
      "MATT Auth confirm error:",
      error.message
    );

    const target = new URL(
      "/ustaw-haslo",
      request.url
    );

    target.searchParams.set(
      "error",
      "Link jest nieprawidłowy, wygasł albo został już użyty. Wygeneruj nowy link w panelu."
    );

    return NextResponse.redirect(target);
  }

  return NextResponse.redirect(
    new URL(next, request.url)
  );
}
