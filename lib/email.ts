type MailPayload = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
};

function htmlToText(html: string) {
  return html
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\\s\\S]*?)<\/a>/gi, "$2 ($1)")
    .replace(/<br\s*\/?>(?=\s*)/gi, "\n")
    .replace(/<\/p>|<\/div>|<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/\\n\\s*\\n\\s*\\n+/g, "\n\n")
    .replace(/[ \\t]+/g, " ")
    .replace(/ *\\n */g, "\n")
    .trim();
}

export const MATT_EMAIL_FROM =
  "MATT TRANSPORT <kontakt@matt-transport.pl>";

function normalizeRecipients(
  value: string | string[] | null | undefined
) {
  const list = Array.isArray(value)
    ? value
    : value
    ? [value]
    : [];

  return list
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

async function postResend(
  apiKey: string,
  body: Record<string, unknown>
) {
  try {
    const response = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body),
        cache: "no-store"
      }
    );

    const data =
      await response.json().catch(() => ({}));

    return {
      ok: response.ok,
      status: response.status,
      data
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: {
        message:
          error instanceof Error
            ? error.message
            : "Nie udało się połączyć z Resend."
      }
    };
  }
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

  const recipients =
    normalizeRecipients(payload.to);

  if (!recipients.length) {
    return {
      sent: false,
      skipped: true,
      error: "Brak adresu e-mail odbiorcy."
    };
  }

  const from =
    recipients.some(
      (recipient) =>
        recipient.toLowerCase() === "kontakt@matt-transport.pl"
    )
      ? "MATT Booking <booking@matt-transport.pl>"
      : MATT_EMAIL_FROM;

  if (!payload.html && !payload.text) {
    return {
      sent: false,
      skipped: true,
      error: "Brak treści wiadomości."
    };
  }

  const messageBody: Record<string, unknown> = {
    from,
    to: recipients,
    subject: payload.subject,
    reply_to: "kontakt@matt-transport.pl"
  };

  if (payload.html) {
    messageBody.html = payload.html;
  }

  if (payload.text) {
    messageBody.text = payload.text;
  } else if (payload.html) {
    messageBody.text = htmlToText(payload.html);
  }

  const result = await postResend(
    apiKey,
    messageBody
  );

  if (!result.ok) {
    return {
      sent: false,
      skipped: false,
      error:
        result.data?.message ??
        result.data?.error?.message ??
        `Błąd wysyłki e-mail (${result.status})`
    };
  }

  return {
    sent: true,
    skipped: false,
    id: result.data?.id ?? null
  };
}
