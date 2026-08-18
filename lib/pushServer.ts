import webpush from "web-push";

function configureWebPush() {
  const subject =
    process.env.VAPID_SUBJECT ||
    "mailto:kontakt@matt-transport.pl";

  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  const privateKey =
    process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    throw new Error(
      "Brak kluczy VAPID w Vercel."
    );
  }

  webpush.setVapidDetails(
    subject,
    publicKey,
    privateKey
  );
}

export async function sendDriverPush(
  admin: any,
  driverId: string,
  {
    title,
    body,
    url = "/kierowca",
    tag = "matt-driver",
    bookingId = null,
    flightAlertId = null,
    eventKey,
    force = false
  }: {
    title: string;
    body: string;
    url?: string;
    tag?: string;
    bookingId?: string | null;
    flightAlertId?: string | null;
    eventKey: string;
    force?: boolean;
  }
) {
  if (!driverId) {
    return {
      sent: 0,
      failed: 0,
      skipped: true
    };
  }

  if (!force) {
    const { data: already } = await admin
      .from("push_notification_log")
      .select("id")
      .eq("driver_id", driverId)
      .eq("event_key", eventKey)
      .maybeSingle();

    if (already) {
      return {
        sent: 0,
        failed: 0,
        skipped: true
      };
    }
  }

  const { data: subscriptions } = await admin
    .from("driver_push_subscriptions")
    .select("*")
    .eq("driver_id", driverId)
    .eq("active", true);

  if (!subscriptions?.length) {
    return {
      sent: 0,
      failed: 0,
      skipped: true
    };
  }

  configureWebPush();

  let sent = 0;
  let failed = 0;

  const payload = JSON.stringify({
    title,
    body,
    url,
    tag,
    renotify: true
  });

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        },
        payload,
        {
          TTL: 60 * 60
        }
      );

      sent += 1;
    } catch (error: any) {
      failed += 1;

      const statusCode =
        Number(error?.statusCode || 0);

      if (
        statusCode === 404 ||
        statusCode === 410
      ) {
        await admin
          .from("driver_push_subscriptions")
          .update({
            active: false,
            updated_at: new Date().toISOString()
          })
          .eq("id", sub.id);
      }
    }
  }

  if (!force) {
    await admin
      .from("push_notification_log")
      .insert({
        driver_id: driverId,
        booking_id: bookingId,
        flight_alert_id: flightAlertId,
        event_key: eventKey,
        title,
        body,
        url,
        sent_count: sent,
        failed_count: failed
      });
  }

  return { sent, failed, skipped: false };
}

export async function sendFlightAlertPush(
  admin: any,
  booking: any,
  alert: any
) {
  if (!booking?.driver_id || !alert?.id) {
    return null;
  }

  return sendDriverPush(
    admin,
    booking.driver_id,
    {
      title: alert.title,
      body: alert.message,
      url: "/kierowca",
      tag: `flight-${booking.id}`,
      bookingId: booking.id,
      flightAlertId: alert.id,
      eventKey: `flight-alert:${alert.id}:${alert.updated_at || alert.created_at}`
    }
  );
}
