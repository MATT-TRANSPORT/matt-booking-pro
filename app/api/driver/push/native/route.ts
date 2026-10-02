import { NextRequest, NextResponse } from "next/server";
import { driverClient } from "@/lib/driver";

export async function POST(req: NextRequest) {
  const { admin, driver, user } = await driverClient();
  const body = await req.json();
  const token = String(body?.token || "").trim();
  const platform = String(body?.platform || "").toLowerCase();
  if (!token || !["android", "ios"].includes(platform)) return NextResponse.json({ error: "Nieprawidłowy token." }, { status: 400 });
  const { error } = await admin.from("driver_native_push_tokens").upsert({ driver_id: driver.id, user_id: user.id, token, platform, active: true, updated_at: new Date().toISOString() }, { onConflict: "token" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
