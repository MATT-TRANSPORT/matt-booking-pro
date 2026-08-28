import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  const pathname = request.nextUrl.pathname;
  const bookingHost = process.env.NEXT_PUBLIC_BOOKING_HOST;
  const panelHost = process.env.NEXT_PUBLIC_PANEL_HOST;

  // Publiczny formularz nie wymaga odświeżania sesji użytkownika.
  if (host === bookingHost && pathname === "/") {
    return NextResponse.rewrite(new URL("/booking", request.url));
  }

  // Najpierw przechodzimy na /panel, a dopiero kolejne żądanie
  // odświeża sesję Supabase. Dzięki temu nie gubimy Set-Cookie
  // wygenerowanego przy rotacji refresh tokena.
  if (host === panelHost && pathname === "/") {
    return NextResponse.redirect(new URL("/panel", request.url));
  }

  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
