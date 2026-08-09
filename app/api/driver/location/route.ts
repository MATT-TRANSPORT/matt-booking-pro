import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { lat, lng, driverId } = await req.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({error:"Brak autoryzacji"},{status:401});
  if (!driverId || typeof lat !== "number" || typeof lng !== "number")
    return NextResponse.json({error:"Brak danych GPS"},{status:400});
  const { error } = await supabase.from("driver_locations").insert({driver_id:driverId,lat,lng});
  if (error) return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({ok:true});
}
