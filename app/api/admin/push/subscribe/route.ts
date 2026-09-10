import { NextRequest, NextResponse } from "next/server";
import { adminPushClient, AdminPushAuthError } from "@/lib/adminPushAuth";

export async function POST(req: NextRequest) {
  try {
    const { admin, user } = await adminPushClient();
    const subscription = await req.json();

    const endpoint = String(subscription?.endpoint || "");
    const p256dh = String(subscription?.keys?.p256dh || "");
    const auth = String(subscription?.keys?.auth || "");

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { error: "Niepełne dane subskrypcji push." },
        { status: 400 }
      );
    }

    const { error } = await admin
      .from("admin_push_subscriptions")
      .upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh,
          auth,
          user_agent: req.headers.get("user-agent") || null,
          active: true,
          updated_at: new Date().toISOString()
        },
        { onConflict: "endpoint" }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof AdminPushAuthError ? error.status : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd zapisu powiadomień." },
      { status }
    );
  }
}
