import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMattEmail } from "@/lib/email";

function makeTemporaryPassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%*-_";
  const all = upper + lower + digits + symbols;

  const pick = (chars: string) => chars[randomBytes(1)[0] % chars.length];
  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  while (chars.length < 18) chars.push(pick(all));

  // Losowe przetasowanie z wykorzystaniem crypto.randomBytes.
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomBytes(1)[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}

export async function POST(req: NextRequest) {
  const auth = await createClient();

  const {
    data: { user }
  } = await auth.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Brak uprawnień." }, { status: 403 });
  }

  const body = await req.json();
  const type = String(body.type || "");
  const id = String(body.id || "");
  const action = String(body.action || "send_link");

  if (!["driver", "company"].includes(type) || !id) {
    return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  }

  if (!["send_link", "temporary_password"].includes(action)) {
    return NextResponse.json({ error: "Nieznana operacja." }, { status: 400 });
  }

  let email = "";
  let name = "";

  if (type === "driver") {
    const { data } = await admin.from("drivers").select("*").eq("id", id).single();
    if (!data) return NextResponse.json({ error: "Nie znaleziono kierowcy." }, { status: 404 });

    email = String(data.email || "").trim().toLowerCase();
    name = data.full_name;
  } else {
    const { data } = await admin.from("companies").select("*").eq("id", id).single();
    if (!data) return NextResponse.json({ error: "Nie znaleziono firmy." }, { status: 404 });

    email = String(data.email || "").trim().toLowerCase();
    name = data.name;
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Najpierw wpisz poprawny adres e-mail." }, { status: 400 });
  }

  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listed.error) return NextResponse.json({ error: listed.error.message }, { status: 500 });

  let authUser =
    listed.data.users.find((u: any) => String(u.email || "").toLowerCase() === email) || null;

  async function attachPortalUser(userId: string) {
    if (type === "driver") {
      const { error } = await admin
        .from("drivers")
        .update({ user_id: userId, portal_invited_at: new Date().toISOString() })
        .eq("id", id);
      return error;
    }

    // Jedno konto e-mail powinno wskazywać na jedną aktywną firmę w obecnej wersji portalu.
    // Usuwamy przypadkowe duplikaty członkostwa tego samego użytkownika przed przypięciem właściwej firmy.
    const { error: cleanupError } = await admin
      .from("company_users")
      .delete()
      .eq("user_id", userId)
      .neq("company_id", id);

    if (cleanupError) return cleanupError;

    const { data: existing, error: existingError } = await admin
      .from("company_users")
      .select("id")
      .eq("company_id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingError) return existingError;

    if (!existing) {
      const { error } = await admin.from("company_users").insert({
        company_id: id,
        user_id: userId,
        role: "admin",
        active: true
      });
      if (error) return error;
    } else {
      const { error } = await admin
        .from("company_users")
        .update({ role: "admin", active: true })
        .eq("id", existing.id);
      if (error) return error;
    }

    const { error } = await admin
      .from("companies")
      .update({ portal_invited_at: new Date().toISOString() })
      .eq("id", id);

    return error;
  }

  if (action === "temporary_password") {
    if (type !== "company") {
      return NextResponse.json(
        { error: "Hasło tymczasowe jest obecnie dostępne tylko dla kont B2B." },
        { status: 400 }
      );
    }

    const temporaryPassword = makeTemporaryPassword();

    if (!authUser) {
      const created = await admin.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: { portal_type: "company", company_name: name }
      });

      if (created.error || !created.data.user) {
        return NextResponse.json(
          { error: created.error?.message || "Nie udało się utworzyć konta użytkownika." },
          { status: 500 }
        );
      }

      authUser = created.data.user;
    } else {
      const updated = await admin.auth.admin.updateUserById(authUser.id, {
        password: temporaryPassword,
        email_confirm: true
      });

      if (updated.error) {
        return NextResponse.json({ error: updated.error.message }, { status: 500 });
      }
    }

    const attachError = await attachPortalUser(authUser.id);
    if (attachError) return NextResponse.json({ error: attachError.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      email,
      user_id: authUser.id,
      temporary_password: temporaryPassword
    });
  }

  const linkType: "invite" | "recovery" = authUser ? "recovery" : "invite";
  const generated = await admin.auth.admin.generateLink({ type: linkType, email });

  if (generated.error) {
    return NextResponse.json({ error: generated.error.message }, { status: 500 });
  }

  authUser = generated.data.user || authUser;
  if (!authUser) {
    return NextResponse.json({ error: "Nie udało się utworzyć konta użytkownika." }, { status: 500 });
  }

  const tokenHash = generated.data.properties?.hashed_token || null;
  if (!tokenHash) {
    return NextResponse.json(
      { error: "Supabase nie zwrócił tokenu aktywacyjnego. Spróbuj wygenerować link ponownie." },
      { status: 500 }
    );
  }

  const attachError = await attachPortalUser(authUser.id);
  if (attachError) return NextResponse.json({ error: attachError.message }, { status: 500 });

  const origin = req.nextUrl.origin.replace(/\/$/, "");
  const confirmUrl =
    `${origin}/auth/confirm` +
    `?token_hash=${encodeURIComponent(tokenHash)}` +
    `&type=${encodeURIComponent(linkType)}` +
    `&next=${encodeURIComponent("/ustaw-haslo")}`;

  const portalName = type === "driver" ? "panelu kierowcy" : "panelu firmy";

  const mailResult = await sendMattEmail({
    to: email,
    subject: `Dostęp do ${portalName} MATT TRANSPORT`,
    html: `
      <div style="font-family:Arial,sans-serif;background:#0b0e13;color:#fff;padding:30px">
        <div style="max-width:650px;margin:auto;background:#151923;border:1px solid #343b49;border-radius:16px;padding:28px">
          <h2 style="color:#f1d28b">MATT TRANSPORT</h2>
          <h1>${linkType === "invite" ? "Utwórz hasło do swojego konta" : "Ustaw nowe hasło"}</h1>
          <p>Dzień dobry ${name}, kliknij poniżej, aby ustawić hasło do ${portalName}.</p>
          <p style="margin:24px 0">
            <a href="${confirmUrl}" style="display:inline-block;background:#d5ae5d;color:#111;padding:14px 20px;border-radius:10px;text-decoration:none;font-weight:bold">
              ${linkType === "invite" ? "USTAW HASŁO" : "USTAW NOWE HASŁO"}
            </a>
          </p>
          <p style="color:#aab1bc;font-size:12px;line-height:1.6">
            Link jest jednorazowy i przeznaczony tylko dla Ciebie. Jeśli wygaśnie, administrator MATT TRANSPORT może wygenerować nowy.
          </p>
        </div>
      </div>
    `
  });

  if (!mailResult.sent) {
    return NextResponse.json(
      { error: mailResult.error || "Konto zostało przygotowane, ale nie udało się wysłać e-maila." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, email, user_id: authUser.id });
}
