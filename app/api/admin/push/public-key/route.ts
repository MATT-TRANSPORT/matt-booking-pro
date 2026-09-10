import { NextResponse } from "next/server";
import { adminPushClient, AdminPushAuthError } from "@/lib/adminPushAuth";

export async function GET() {
  try {
    await adminPushClient();

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      return NextResponse.json(
        { error: "Brak NEXT_PUBLIC_VAPID_PUBLIC_KEY w Vercel." },
        { status: 500 }
      );
    }

    return NextResponse.json({ publicKey });
  } catch (error) {
    const status = error instanceof AdminPushAuthError ? error.status : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd autoryzacji." },
      { status }
    );
  }
}
