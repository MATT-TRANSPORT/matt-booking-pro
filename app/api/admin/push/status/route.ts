import { NextRequest, NextResponse } from "next/server";
import { adminPushClient, AdminPushAuthError } from "@/lib/adminPushAuth";

export async function POST(req: NextRequest) {
  try {
    const { admin, user } = await adminPushClient();
    const body = await req.json();
    const endpoint = String(body?.endpoint || "");

    if (!endpoint) {
      return NextResponse.json({ active: false });
    }

    const { data, error } = await admin
      .from("admin_push_subscriptions")
      .select("id,active")
      .eq("user_id", user.id)
      .eq("endpoint", endpoint)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ active: Boolean(data?.active) });
  } catch (error) {
    const status = error instanceof AdminPushAuthError ? error.status : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd sprawdzania powiadomień." },
      { status }
    );
  }
}
