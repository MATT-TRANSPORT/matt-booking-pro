import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
export async function middleware(request: NextRequest){
  const sessionResponse=await updateSession(request);
  const host=request.headers.get("host")?.split(":")[0]??"";
  const path=request.nextUrl.pathname;
  if(host===process.env.NEXT_PUBLIC_BOOKING_HOST && path==="/") return NextResponse.rewrite(new URL("/booking",request.url));
  if(host===process.env.NEXT_PUBLIC_PANEL_HOST && path==="/") return NextResponse.rewrite(new URL("/panel",request.url));
  return sessionResponse;
}
export const config={matcher:["/((?!_next/static|_next/image|favicon.ico).*)"]};
