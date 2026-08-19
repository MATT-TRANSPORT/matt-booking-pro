import { NextResponse } from "next/server";
import { customerMessagingConfigured } from "@/lib/customerNotifications";

export async function GET() {
  return NextResponse.json({
    module: "communications-lite",
    twilio: false,
    sms: false,
    whatsapp_api: false,
    ...customerMessagingConfigured()
  });
}
