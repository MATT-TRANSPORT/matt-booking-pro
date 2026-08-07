import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  const pathname = request.nextUrl.pathname;
  const bookingHost = process.env.NEXT_PUBLIC_BOOKING_HOST;
  const panelHost = process.env.NEXT_PUBLIC_PANEL_HOST;

  if (host === bookingHost && pathname === "/") {
    return NextResponse.rewrite(new URL("/booking", request.url));
  }
  if (host === panelHost && pathname === "/") {
    return NextResponse.rewrite(new URL("/panel", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
