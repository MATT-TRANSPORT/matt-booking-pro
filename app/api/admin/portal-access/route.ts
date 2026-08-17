import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMattEmail } from "@/lib/email";

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

  if (!["driver", "company"].includes(type) || !id) {
    return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  }

  let email = "";
  let name = "";

  if (type === "driver") {
    const { data } = await admin
      .from("drivers")
      .select("*")
      .eq("id", id)
      .single();

    if (!data) {
      return NextResponse.json({ error: "Nie znaleziono kierowcy." }, { status: 404 });
    }

    email = String(data.email || "").trim();
    name = data.full_name;
  } else {
    const { data } = await admin
      .from("companies")
      .select("*")
      .eq("id", id)
      .single();

    if (!data) {
      return NextResponse.json({ error: "Nie znaleziono firmy." }, { status: 404 });
    }

    email = String(data.email || "").trim();
    name = data.name;
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "Najpierw wpisz poprawny adres e-mail." },
      { status: 400 }
    );
  }

  const listed = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });

  if (listed.error) {
    return NextResponse.json({ error: listed.error.message }, { status: 500 });
  }

  let authUser =
    listed.data.users.find(
      (u: any) =>
        String(u.email || "").toLowerCase() === email.toLowerCase()
    ) || null;

  // Najważniejsza zmiana:
  // bierzemy faktyczny publiczny host z żądania, np. https://panel.matt-transport.pl.
  // Nie korzystamy już z localhost ani przypadkowego adresu deweloperskiego.
  const origin = req.nextUrl.origin.replace(/\/$/, "");
  const redirectTo =
    `${origin}/auth/callback?next=${encodeURIComponent("/ustaw-haslo")}`;

  let actionLink: string | null = null;

  if (!authUser) {
    const generated = await admin.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        redirectTo
      }
    });

    if (generated.error) {
      return NextResponse.json(
        { error: generated.error.message },
        { status: 500 }
      );
    }

    authUser = generated.data.user;
    actionLink = generated.data.properties?.action_link || null;
  } else {
    const generated = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo
      }
    });

    if (generated.error) {
      return NextResponse.json(
        { error: generated.error.message },
        { status: 500 }
      );
    }

    actionLink = generated.data.properties?.action_link || null;
  }

  if (!authUser) {
    return NextResponse.json(
      { error: "Nie udało się utworzyć konta użytkownika." },
      { status: 500 }
    );
  }

  if (type === "driver") {
    const { error } = await admin
      .from("drivers")
      .update({
        user_id: authUser.id,
        portal_invited_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { data: existing } = await admin
      .from("company_users")
      .select("id")
      .eq("company_id", id)
      .eq("user_id", authUser.id)
      .maybeSingle();

    if (!existing) {
      const { error } = await admin.from("company_users").insert({
        company_id: id,
        user_id: authUser.id,
        role: "admin",
        active: true
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    await admin
      .from("companies")
      .update({ portal_invited_at: new Date().toISOString() })
      .eq("id", id);
  }

  if (!actionLink) {
    return NextResponse.json(
      { error: "Supabase nie zwrócił linku aktywacyjnego." },
      { status: 500 }
    );
  }

  const portalName =
    type === "driver" ? "panelu kierowcy" : "panelu firmy";

  const mail = await sendMattEmail({
    to: email,
    subject: `Dostęp do ${portalName} MATT TRANSPORT`,
    html: `
      <div style="font-family:Arial,sans-serif;background:#0b0e13;color:#fff;padding:30px">
        <div style="max-width:650px;margin:auto;background:#151923;border:1px solid #343b49;border-radius:16px;padding:28px">
          <h2 style="color:#f1d28b">MATT TRANSPORT</h2>
          <h1>Twój dostęp jest gotowy</h1>
          <p>Dzień dobry ${name}, kliknij poniżej i ustaw własne hasło.</p>

          <p style="margin:24px 0">
            <a
              href="${actionLink}"
              style="display:inline-block;background:#d5ae5d;color:#111;padding:14px 20px;border-radius:10px;text-decoration:none;font-weight:bold"
            >
              USTAW HASŁO
            </a>
          </p>

          <p style="color:#aab1bc;font-size:12px">
            Link jest przeznaczony tylko dla Ciebie. Jeżeli wygaśnie,
            administrator może wygenerować nowy z panelu MATT Booking PRO.
          </p>
        </div>
      </div>
    `
  });

  if (!mail.sent) {
    return NextResponse.json(
      {
        error: mail.error || "Konto utworzono, ale nie udało się wysłać e-maila."
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    email,
    user_id: authUser.id,
    redirect_to: redirectTo
  });
}
