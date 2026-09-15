import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CUSTOMER_SESSION_COOKIE,
  CUSTOMER_SESSION_TTL_DAYS,
  customerSessionExpiry,
  hashCustomerToken,
  newCustomerToken
} from "@/lib/customerAccount";

export const dynamic = "force-dynamic";

function redirectTo(req: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, req.nextUrl.origin));
}

export async function GET(req: NextRequest) {
  const rawToken = String(req.nextUrl.searchParams.get("token") || "");
  if (!rawToken || rawToken.length > 256) {
    return redirectTo(req, "/moje-przejazdy?error=link");
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const tokenHash = hashCustomerToken(rawToken);

  const { data: login } = await admin
    .from("customer_portal_login_tokens")
    .select("id,email,expires_at,used_at")
    .eq("token_hash", tokenHash)
    .is("used_at", null)
    .gt("expires_at", now)
    .maybeSingle();

  if (!login) {
    return redirectTo(req, "/moje-przejazdy?error=link");
  }

  // Atomowo konsumujemy jednorazowy link: tylko pierwszy request może przejść dalej.
  const { data: consumed } = await admin
    .from("customer_portal_login_tokens")
    .update({ used_at: now })
    .eq("id", login.id)
    .is("used_at", null)
    .select("id,email")
    .maybeSingle();

  if (!consumed) {
    return redirectTo(req, "/moje-przejazdy?error=link");
  }

  const rawSession = newCustomerToken();
  const expiresAt = customerSessionExpiry();
  const { error: sessionError } = await admin
    .from("customer_portal_sessions")
    .insert({
      email: consumed.email,
      session_hash: hashCustomerToken(rawSession),
      expires_at: expiresAt.toISOString(),
      last_seen_at: now
    });

  if (sessionError) {
    console.error("Customer portal session:", sessionError);
    return redirectTo(req, "/moje-przejazdy?error=session");
  }

  const response = redirectTo(req, "/moje-przejazdy");
  response.cookies.set(CUSTOMER_SESSION_COOKIE, rawSession, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: CUSTOMER_SESSION_TTL_DAYS * 24 * 60 * 60
  });

  return response;
}
