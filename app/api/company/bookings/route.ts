import { NextRequest,NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRICES } from "@/lib/pricing";

export async function POST(req:NextRequest){
  const auth=await createClient(); const {data:{user}}=await auth.auth.getUser();
  if(!user)return NextResponse.json({error:"Brak autoryzacji."},{status:401});
  const {data:m}=await auth.from("company_users").select("company_id,role").eq("user_id",user.id).eq("active",true).single();
  if(!m)return NextResponse.json({error:"Brak przypisanej firmy."},{status:403});
  const b=await req.json(); const admin=createAdminClient();
  const {data:e}=await admin.from("company_employees").select("*").eq("id",b.employeeId).eq("company_id",m.company_id).eq("active",true).single();
  if(!e)return NextResponse.json({error:"Nieprawidłowy pracownik."},{status:400});
  const p=PRICES[b.airport as keyof typeof PRICES]; if(!p)return NextResponse.json({error:"Nieprawidłowe lotnisko."},{status:400});
  const vehicle=b.vehicleType==="bus"?"bus":"car"; const mult=b.serviceType==="roundtrip"?2:1;
  const base=p[vehicle]*mult; const extra=Math.max(0,Number(b.distanceKm||0)-20)*2.4*mult; const total=base+extra;
  const {data,error}=await admin.from("bookings").insert({
    company_id:m.company_id,company_employee_id:e.id,ordered_by_user_id:user.id,booking_source:"b2b_portal",
    service_type:b.serviceType,pickup_address:b.address,airport_key:b.airport,airport_label:p.label,
    travel_date:b.travelDate,travel_time:b.travelTime,return_date:b.returnDate||null,return_time:b.returnTime||null,
    passengers:Number(b.passengers||1),vehicle_type:vehicle,distance_km:Number(b.distanceKm||0),
    customer_name:`${e.first_name} ${e.last_name}`,phone:e.phone||"",email:e.email||"",
    invoice_required:true,flight_number:b.flightNumber||null,return_flight_number:b.returnFlightNumber||null,
    base_price:base,extra_price:extra,vat_price:0,total_price:total,status:"pending",notes:b.notes||null
  }).select("*").single();
  if(error)return NextResponse.json({error:error.message},{status:500});
  await admin.from("booking_history").insert({booking_id:data.id,event:"Rezerwacja utworzona przez portal B2B",created_by:user.id});
  return NextResponse.json(data);
}
