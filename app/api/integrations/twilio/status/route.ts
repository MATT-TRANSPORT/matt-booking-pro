import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    ok: true,
    disabled: true,
    message: "Twilio wyłączone w v3.0.1 COMMUNICATIONS LITE."
  });
}
