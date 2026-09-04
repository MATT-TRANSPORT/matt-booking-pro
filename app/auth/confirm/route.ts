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

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/ustaw-haslo";
  }
  return value;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function errorRedirect(request: NextRequest, message: string) {
  const target = new URL("/ustaw-haslo", request.url);
  target.searchParams.set("error", message);
  return NextResponse.redirect(target, 303);
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const rawType = request.nextUrl.searchParams.get("type");
  const next = safeNext(request.nextUrl.searchParams.get("next"));

  if (!tokenHash || !rawType || !ALLOWED_TYPES.has(rawType)) {
    return errorRedirect(
      request,
      "Nieprawidłowy link aktywacyjny. Poproś administratora o wysłanie nowego linku."
    );
  }

  const html = `<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>Potwierdź ustawienie hasła — MATT TRANSPORT</title>
  <style>
    *{box-sizing:border-box}body{margin:0;background:#0b0e13;color:#fff;font-family:Arial,sans-serif;min-height:100vh;display:grid;place-items:center;padding:24px}.card{width:min(590px,100%);background:#151923;border:1px solid #343b49;border-radius:22px;padding:28px}.badge{display:inline-block;border:1px solid #715923;border-radius:999px;padding:8px 13px;color:#f1c968;font-size:14px}.title{font-size:38px;line-height:1.08;margin:28px 0 14px}.text{color:#c7cdd7;line-height:1.65;font-size:16px}.btn{width:100%;border:0;border-radius:12px;padding:15px 18px;background:#d5ae5d;color:#111;font-weight:800;font-size:16px;cursor:pointer;margin-top:18px}.note{color:#8f98a8;font-size:12px;line-height:1.55;margin-top:18px}
  </style>
</head>
<body>
  <main class="card">
    <span class="badge">MATT TRANSPORT</span>
    <h1 class="title">Potwierdź ustawienie hasła</h1>
    <p class="text">Kliknij poniższy przycisk, aby bezpiecznie przejść do ustawienia hasła do swojego konta.</p>
    <form method="post" action="/auth/confirm">
      <input type="hidden" name="token_hash" value="${escapeHtml(tokenHash)}" />
      <input type="hidden" name="type" value="${escapeHtml(rawType)}" />
      <input type="hidden" name="next" value="${escapeHtml(next)}" />
      <button class="btn" type="submit">KONTYNUUJ — USTAW HASŁO</button>
    </form>
    <p class="note">Ten dodatkowy krok chroni jednorazowy link przed automatycznymi skanerami bezpieczeństwa poczty firmowej.</p>
  </main>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow"
    }
  });
}

export async function POST(request: NextRequest) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return errorRedirect(
      request,
      "Nie udało się potwierdzić linku. Poproś administratora o wysłanie nowego linku."
    );
  }

  const tokenHash = String(formData.get("token_hash") || "");
  const rawType = String(formData.get("type") || "");
  const next = safeNext(String(formData.get("next") || "/ustaw-haslo"));

  if (!tokenHash || !rawType || !ALLOWED_TYPES.has(rawType)) {
    return errorRedirect(
      request,
      "Nieprawidłowy link aktywacyjny. Poproś administratora o wysłanie nowego linku."
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: rawType as EmailOtpType
  });

  if (error) {
    console.error("MATT Auth confirm error:", error.message);
    return errorRedirect(
      request,
      "Link jest nieprawidłowy, wygasł albo został już użyty. Wygeneruj nowy link w panelu."
    );
  }

  return NextResponse.redirect(new URL(next, request.url), 303);
}
