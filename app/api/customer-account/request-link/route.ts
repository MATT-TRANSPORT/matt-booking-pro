import { customerJson, requestCustomerLocale } from "@/lib/customerErrors";
import { resolveCustomerLocale } from "@/lib/bookingLocale";
import { customerText } from "@/lib/customerCopy";
import { customerAccountEmail } from "@/lib/customerAccountEmail";
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
  let responseLocale=requestCustomerLocale(req);
  const json=(payload:any,init?:ResponseInit)=>customerJson(responseLocale,payload,init);
  let body: any = {};
  const genericMessage = () => customerText(GENERIC_MESSAGE, body?.locale);
  try {
    body = await req.json();
 responseLocale=requestCustomerLocale(req,body?.locale);
  } catch {
    return json({ ok: true, message: genericMessage() });
  }

  const email = normalizeCustomerEmail(body?.email);
  if (!validCustomerEmail(email)) {
    return json({ ok: true, message: genericMessage() });
  }

  const admin = createAdminClient();
  const hasBookings = await customerHasPrivateBookings(admin, email);
  if (!hasBookings) {
    return json({ ok: true, message: genericMessage() });
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
    return json({ ok: true, message: genericMessage() });
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
    return json({ ok: true, message: genericMessage() });
  }

  const loginUrl = `${customerBookingBaseUrl()}/moje-przejazdy/weryfikacja?token=${encodeURIComponent(rawToken)}&lang=${resolveCustomerLocale(body.locale)}`;
  const result = await sendMattEmail({
    to: email,
    ...customerAccountEmail(body.locale, email, loginUrl)
  });

  if (!result.sent) {
    console.error("Customer portal login e-mail:", result.error || "unknown error");
  }

  return json({ ok: true, message: genericMessage() });
}
