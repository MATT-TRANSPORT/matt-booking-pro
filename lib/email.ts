type MailPayload = {
  to: string | string[];
  subject: string;
  html: string;
};

export const MATT_EMAIL_FROM =
  "MATT TRANSPORT <kontakt@matt-transport.pl>";

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://panel.matt-transport.pl"
  ).replace(/\/$/, "");
}

const MATT_LOGO_CONTENT_ID = "matt-transport-logo";

function withStaticMattLogo(html: string) {
  const logoBlock = `
    <div style="text-align:center;padding:20px 18px 10px">
      <img
        src="cid:${MATT_LOGO_CONTENT_ID}"
        alt="MATT TRANSPORT"
        width="320"
        style="display:inline-block;width:320px;max-width:82%;height:auto;border:0;outline:none;text-decoration:none"
      >
    </div>
  `;

  const source = String(html || "");

  const firstDiv = source.search(/<div\b/i);

  if (firstDiv >= 0) {
    const close = source.indexOf(">", firstDiv);

    if (close >= 0) {
      return (
        source.slice(0, close + 1) +
        logoBlock +
        source.slice(close + 1)
      );
    }
  }

  return logoBlock + source;
}

export async function sendMattEmail(
  payload: MailPayload
) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      sent: false,
      skipped: true,
      error: "Brak RESEND_API_KEY"
    };
  }

  const logoUrl =
    `${appBaseUrl()}/MATT_TRANSPORT_gold_static.png`;

  const response = await fetch(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: MATT_EMAIL_FROM,
        to: Array.isArray(payload.to)
          ? payload.to
          : [payload.to],
        subject: payload.subject,
        html: withStaticMattLogo(payload.html),
        reply_to: "kontakt@matt-transport.pl",
        attachments: [
          {
            path: logoUrl,
            filename: "MATT_TRANSPORT_gold_static.png",
            content_id: MATT_LOGO_CONTENT_ID
          }
        ]
      }),
      cache: "no-store"
    }
  );

  const data =
    await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      sent: false,
      skipped: false,
      error:
        data?.message ??
        data?.error?.message ??
        `Błąd wysyłki e-mail (${response.status})`
    };
  }

  return {
    sent: true,
    skipped: false,
    id: data?.id ?? null
  };
}
