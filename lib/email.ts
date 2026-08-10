type MailPayload = {
  to: string | string[];
  subject: string;
  html: string;
};

export const MATT_EMAIL_FROM =
  "MATT TRANSPORT <kontakt@matt-transport.pl>";

export async function sendMattEmail(payload: MailPayload) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      sent: false,
      skipped: true,
      error: "Brak RESEND_API_KEY"
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: MATT_EMAIL_FROM,
      to: Array.isArray(payload.to) ? payload.to : [payload.to],
      subject: payload.subject,
      html: payload.html,
      reply_to: "kontakt@matt-transport.pl"
    }),
    cache: "no-store"
  });

  const data = await response.json().catch(() => ({}));

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
