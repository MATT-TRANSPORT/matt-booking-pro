import { readFile } from "node:fs/promises";
import path from "node:path";

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

function withExternalMattLogo(html: string) {
  const logoUrl =
    `${appBaseUrl()}/MATT_TRANSPORT_gold_static.png`;

  const logoBlock = `
    <div style="text-align:center;padding:20px 18px 10px">
      <img
        src="${logoUrl}"
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

async function localLogoBase64() {
  try {
    const file = await readFile(
      path.join(
        process.cwd(),
        "public",
        "MATT_TRANSPORT_gold_static.png"
      )
    );

    return file.toString("base64");
  } catch (error) {
    console.error(
      "Nie udało się odczytać logo e-mail:",
      error
    );
    return null;
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

  const common = {
    from: MATT_EMAIL_FROM,
    to: recipients,
    subject: payload.subject,
    reply_to: "kontakt@matt-transport.pl"
  };

  const logoContent =
    await localLogoBase64();

  // Najpierw wysyłamy pełną wersję z osadzonym logo.
  // Plik jest przekazywany bezpośrednio do Resend, bez zależności od URL aplikacji.
  if (logoContent) {
    const first = await postResend(
      apiKey,
      {
        ...common,
        html: withStaticMattLogo(payload.html),
        attachments: [
          {
            content: logoContent,
            filename:
              "MATT_TRANSPORT_gold_static.png",
            content_id:
              MATT_LOGO_CONTENT_ID
          }
        ]
      }
    );

    if (first.ok) {
      return {
        sent: true,
        skipped: false,
        id: first.data?.id ?? null
      };
    }

    console.error(
      "Resend z logo nie powiódł się, próba awaryjna:",
      first.status,
      first.data
    );
  }

  // Dostarczenie wiadomości jest ważniejsze od logo.
  // Jeżeli załącznik/CID sprawi problem, ponawiamy bez załącznika.
  const fallback = await postResend(
    apiKey,
    {
      ...common,
      html: withExternalMattLogo(
        payload.html
      )
    }
  );

  if (!fallback.ok) {
    return {
      sent: false,
      skipped: false,
      error:
        fallback.data?.message ??
        fallback.data?.error?.message ??
        `Błąd wysyłki e-mail (${fallback.status})`
    };
  }

  return {
    sent: true,
    skipped: false,
    id: fallback.data?.id ?? null,
    fallback: true
  };
}
