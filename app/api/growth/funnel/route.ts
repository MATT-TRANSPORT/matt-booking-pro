import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const STAGES: Record<string, number> = {
  landing: 1,
  form_started: 2,
  route_ready: 3,
  trip_ready: 4,
  quote_viewed: 5,
  customer_started: 6,
  ready_to_submit: 7,
  booking_created: 8
};

function clean(value: unknown, max = 240) {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, max) : null;
}

function safeSource(value: unknown) {
  const source = String(value ?? "direct").trim().toLowerCase().slice(0, 80);
  return source || "direct";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = clean(body?.sessionId, 80) || "";
    const eventName = clean(body?.eventName, 40) || "";
    const stageOrder = STAGES[eventName];

    if (!isUuid(sessionId) || !stageOrder) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const t = body?.tracking && typeof body.tracking === "object" ? body.tracking : {};
    const quote = Number(body?.quoteTotal);
    const bookingId = clean(body?.bookingId, 80);

    const row = {
      session_id: sessionId,
      event_name: eventName,
      stage_order: stageOrder,
      acquisition_source: safeSource(t.acquisitionSource),
      utm_source: clean(t.utmSource, 120),
      utm_medium: clean(t.utmMedium, 120),
      utm_campaign: clean(t.utmCampaign, 180),
      utm_content: clean(t.utmContent, 180),
      utm_term: clean(t.utmTerm, 180),
      gclid: clean(t.gclid, 240),
      fbclid: clean(t.fbclid, 240),
      referral_code: clean(t.referralCode, 120),
      landing_page: clean(t.landingPage, 500),
      service_type: clean(body?.serviceType, 40),
      airport_key: clean(body?.airportKey, 80),
      vehicle_type: clean(body?.vehicleType, 40),
      quote_total: Number.isFinite(quote) && quote >= 0 ? Math.round(quote * 100) / 100 : null,
      booking_id: bookingId && isUuid(bookingId) ? bookingId : null,
      occurred_at: new Date().toISOString()
    };

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("growth_funnel_events")
      .upsert(row, { onConflict: "session_id,event_name" });

    if (error) {
      console.error("Growth funnel:", error);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Growth funnel payload:", error);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
