import { NextRequest } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

type TerminalHandoffPayload = {
  v: 1;
  scope: "terminal";
  sub: string;
  exp: number;
};

function terminalHandoffSecret() {
  const source = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!source) throw new Error("Brak SUPABASE_SERVICE_ROLE_KEY.");
  return crypto.createHash("sha256").update(`matt-terminal-handoff:${source}`).digest();
}

function createTerminalHandoff(userId: string) {
  const payload: TerminalHandoffPayload = {
    v: 1,
    scope: "terminal",
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + 60
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", terminalHandoffSecret())
    .update(encoded)
    .digest("base64url");
  return `mth1.${encoded}.${signature}`;
}

function verifyTerminalHandoff(token: string): TerminalHandoffPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "mth1") return null;

  const [, encoded, signature] = parts;
  const expected = crypto
    .createHmac("sha256", terminalHandoffSecret())
    .update(encoded)
    .digest("base64url");

  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as TerminalHandoffPayload;
    if (payload.v !== 1 || payload.scope !== "terminal" || !payload.sub) return null;
    if (!Number.isInteger(payload.exp) || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createDriverTerminalHandoff(userId: string) {
  return createTerminalHandoff(userId);
}

export async function driverFromBearerRequest(req: NextRequest) {
  const authorization = req.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match?.[1]) return null;

  const token = match[1].trim();
  const admin = createAdminClient();

  let userId: string | null = null;

  if (token.startsWith("mth1.")) {
    userId = verifyTerminalHandoff(token)?.sub || null;
  } else {
    const {
      data: { user },
      error: authError
    } = await admin.auth.getUser(token);

    if (!authError && user) userId = user.id;
  }

  if (!userId) return null;

  const { data: driver, error: driverError } = await admin
    .from("drivers")
    .select("*")
    .eq("user_id", userId)
    .eq("active", true)
    .single();

  if (driverError || !driver) return null;

  return { admin, user: { id: userId }, driver };
}
