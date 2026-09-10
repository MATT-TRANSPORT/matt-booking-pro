import { NextResponse } from "next/server";
import { adminPushClient, AdminPushAuthError } from "@/lib/adminPushAuth";
import { sendAdminPush } from "@/lib/pushServer";

export async function POST() {
  try {
    const { admin, user } = await adminPushClient();

    const result = await sendAdminPush(admin, {
      title: "🔔 MATT ADMINISTRATOR",
      body: "Powiadomienia działają poprawnie na tym telefonie.",
      url: "/panel",
      tag: `matt-admin-test-${Date.now()}`,
      userId: user.id
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const status = error instanceof AdminPushAuthError ? error.status : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się wysłać testu." },
      { status }
    );
  }
}
