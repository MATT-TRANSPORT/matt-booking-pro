import { NextResponse } from "next/server";
import { customerMessagingConfigured } from "@/lib/customerNotifications";

export async function GET() {
  return NextResponse.json({
    module: "customer-messaging",
    ...customerMessagingConfigured()
  });
}
