import { isTestEnvironment } from "@/lib/testEnvironment";
import { emailTrustNotice } from "@/lib/emailTrustNotice";
export type MailResult = { sent: boolean; skipped: boolean; retryable?: boolean; id?: string | null; error?: string };
export type MailPayload = {
  locale?: unknown;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
};

function htmlToText(html: string) {
  return html
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
    .replace(/<br\s*\/?>(?=\s*)/gi, "\n")
    .replace(/<\/p>|<\/div>|<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
}

export const MATT_EMAIL_FROM =
  "MATT TRANSPORT <booking@notify.matt-transport.pl>";

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
  body: Record<string, unknown>,
  idempotencyKey?: string
) {
  try {
    const response = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {})
        },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(15000)
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

/** Freeze the exact provider request before sending an outbox item. */
export function prepareMattEmail(payload: MailPayload): Record<string, unknown> {
  const recipients =
    normalizeRecipients(payload.to);

  if (!recipients.length) {
    throw new Error("Brak adresu e-mail odbiorcy.");
  }

  const from = MATT_EMAIL_FROM;

  if (!payload.html && !payload.text) {
    throw new Error("Brak treści wiadomości.");
  }

  const messageBody: Record<string, unknown> = {
    from,
    to: recipients,
    subject: payload.subject,
    reply_to: "kontakt@matt-transport.pl"
  };

  const inferredLocale = payload.html?.match(/\blang=["'](pl|en|de|cs)["']/i)?.[1];
  const notice = emailTrustNotice(payload.locale ?? inferredLocale);

  if (payload.html) {
    messageBody.html = payload.html + notice.html;
  }

  if (payload.text) {
    messageBody.text = payload.text + notice.text;
  } else if (payload.html) {
    messageBody.text = htmlToText(payload.html) + notice.text;
  }

  return messageBody;
}

export async function sendPreparedMattEmail(body: Record<string, unknown>, idempotencyKey?: string): Promise<MailResult> {
  if (isTestEnvironment()) return { sent: false, skipped: true, retryable: true, error: "Test environment: email delivery disabled" };
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false, skipped: true, retryable: true, error: "Brak RESEND_API_KEY" };
  const result = await postResend(apiKey, body, idempotencyKey);
  if (!result.ok || typeof result.data?.id !== "string") {
    return { sent: false, skipped: false,
      retryable: result.status === 0 || result.status === 408 || result.status === 409 || result.status === 429 || result.status >= 500 || result.ok,
      error: result.data?.message ?? result.data?.error?.message ?? `Błąd wysyłki e-mail (${result.status})` };
  }
  return { sent: true, skipped: false, retryable: false, id: result.data.id };
}

export async function sendMattEmail(payload: MailPayload): Promise<MailResult> {
  if (isTestEnvironment()) return { sent: false, skipped: true, error: "Test environment: email delivery disabled" };
  try { return await sendPreparedMattEmail(prepareMattEmail(payload)); }
  catch (error) { return { sent: false, skipped: true, error: error instanceof Error ? error.message : "Błąd przygotowania e-mail." }; }
}
