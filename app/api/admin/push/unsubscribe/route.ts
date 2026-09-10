import { NextRequest, NextResponse } from "next/server";
import { adminPushClient, AdminPushAuthError } from "@/lib/adminPushAuth";

export async function POST(req: NextRequest) {
  try {
    const { admin, user } = await adminPushClient();
    const body = await req.json();
    const endpoint = String(body?.endpoint || "");

    if (!endpoint) {
      return NextResponse.json({ error: "Brak endpointu push." }, { status: 400 });
    }

    const { error } = await admin
      .from("admin_push_subscriptions")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("endpoint", endpoint);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof AdminPushAuthError ? error.status : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd wyłączania powiadomień." },
      { status }
    );
  }
}
