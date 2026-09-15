import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CUSTOMER_SESSION_COOKIE,
  hashCustomerToken
} from "@/lib/customerAccount";

export async function POST(req: NextRequest) {
  const rawSession = req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value || "";
  if (rawSession) {
    const admin = createAdminClient();
    await admin
      .from("customer_portal_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("session_hash", hashCustomerToken(rawSession));
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(CUSTOMER_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
  return response;
}
