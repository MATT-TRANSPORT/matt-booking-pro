import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendSmsNotification,
  verifyTwilioFormSignature
} from "@/lib/customerNotifications";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const params: Record<string, string> = {};

  for (const [key, value] of form.entries()) {
    params[key] = String(value);
  }

  const callbackUrl = `${
    (process.env.NEXT_PUBLIC_APP_URL || "https://panel.matt-transport.pl")
      .replace(/\/$/, "")
  }/api/integrations/twilio/status`;

  const valid = verifyTwilioFormSignature(
    callbackUrl,
    params,
    req.headers.get("x-twilio-signature")
  );

  if (!valid) {
    return NextResponse.json(
      { error: "Nieprawidłowy podpis Twilio." },
      { status: 403 }
    );
  }

  const sid = params.MessageSid || params.SmsSid || "";
  const status = String(
    params.MessageStatus || params.SmsStatus || "unknown"
  ).toLowerCase();

  if (!sid) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const admin = createAdminClient();

  const { data: log } = await admin
    .from("customer_message_log")
    .select("*")
    .eq("provider_message_sid", sid)
    .maybeSingle();

  if (!log) {
    return NextResponse.json({ ok: true, unknown: true });
  }

  await admin
    .from("customer_message_log")
    .update({
      status,
      error_code: params.ErrorCode || null,
      error_message:
        params.ErrorMessage || params.ChannelStatusMessage || null,
      delivered_at:
        status === "delivered" && !log.delivered_at
          ? new Date().toISOString()
          : log.delivered_at,
      read_at:
        status === "read" && !log.read_at
          ? new Date().toISOString()
          : log.read_at,
      updated_at: new Date().toISOString()
    })
    .eq("id", log.id);

  if (
    log.channel === "whatsapp" &&
    ["failed", "undelivered"].includes(status)
  ) {
    const { data: booking } = await admin
      .from("bookings")
      .select("*")
      .eq("id", log.booking_id)
      .maybeSingle();

    if (
      booking &&
      booking.customer_notification_channel === "whatsapp"
    ) {
      await sendSmsNotification(
        admin,
        booking,
        log.event_key,
        log.body || "MATT TRANSPORT: aktualizacja rezerwacji."
      ).catch((error) => {
        console.error("SMS fallback:", error);
      });
    }
  }

  return NextResponse.json({ ok: true });
}
