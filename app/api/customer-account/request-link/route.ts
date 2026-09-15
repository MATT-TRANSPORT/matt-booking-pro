import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMattEmail } from "@/lib/email";
import {
  customerBookingBaseUrl,
  customerHasPrivateBookings,
  customerLoginExpiry,
  escapeCustomerHtml,
  hashCustomerToken,
  newCustomerToken,
  normalizeCustomerEmail,
  validCustomerEmail
} from "@/lib/customerAccount";

export const dynamic = "force-dynamic";

const GENERIC_MESSAGE =
  "Jeżeli ten adres e-mail jest powiązany z rezerwacjami MATT TRANSPORT, wysłaliśmy link do Moich przejazdów.";

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  }

  const email = normalizeCustomerEmail(body?.email);
  if (!validCustomerEmail(email)) {
    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  }

  const admin = createAdminClient();
  const hasBookings = await customerHasPrivateBookings(admin, email);
  if (!hasBookings) {
    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  }

  // Prosty throttling: maksymalnie jeden nowy link na minutę dla danego e-maila.
  const minuteAgo = new Date(Date.now() - 60_000).toISOString();
  const { data: recent } = await admin
    .from("customer_portal_login_tokens")
    .select("id")
    .eq("email", email)
    .gte("created_at", minuteAgo)
    .limit(1)
    .maybeSingle();

  if (recent) {
    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  }

  const rawToken = newCustomerToken();
  const expiresAt = customerLoginExpiry();
  const { error: tokenError } = await admin
    .from("customer_portal_login_tokens")
    .insert({
      email,
      token_hash: hashCustomerToken(rawToken),
      expires_at: expiresAt.toISOString()
    });

  if (tokenError) {
    console.error("Customer portal login token:", tokenError);
    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  }

  const loginUrl = `${customerBookingBaseUrl()}/moje-przejazdy/weryfikacja?token=${encodeURIComponent(rawToken)}`;
  const safeEmail = escapeCustomerHtml(email);

  const result = await sendMattEmail({
    to: email,
    subject: "MATT TRANSPORT — Moje przejazdy",
    html: `
      <div style="font-family:Arial,sans-serif;background:#090b10;color:#fff;padding:28px">
        <div style="max-width:640px;margin:auto;background:#151923;border:1px solid #343b49;border-radius:18px;padding:28px">
          <div style="font-size:13px;letter-spacing:.14em;color:#d4af37;font-weight:700">MATT TRANSPORT</div>
          <h1 style="margin:12px 0 8px">Moje przejazdy</h1>
          <p style="color:#c6cbd3;line-height:1.6">Otrzymaliśmy prośbę o dostęp do rezerwacji powiązanych z adresem <strong style="color:#fff">${safeEmail}</strong>.</p>
          <p style="color:#c6cbd3;line-height:1.6">Kliknij poniżej, aby bezpiecznie otworzyć historię i najbliższe przejazdy. Link jest jednorazowy i ważny przez 15 minut.</p>
          <p style="margin:26px 0">
            <a href="${loginUrl}" style="display:inline-block;background:#d4af37;color:#090b10;padding:14px 20px;border-radius:12px;text-decoration:none;font-weight:800">OTWÓRZ MOJE PRZEJAZDY</a>
          </p>
          <p style="color:#8f96a3;font-size:13px;line-height:1.5">Jeżeli to nie Ty prosiłeś o dostęp, zignoruj tę wiadomość. Nikt nie uzyska dostępu bez kliknięcia linku wysłanego na Twój e-mail.</p>
        </div>
      </div>`
  });

  if (!result.sent) {
    console.error("Customer portal login e-mail:", result.error || "unknown error");
  }

  return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
}
