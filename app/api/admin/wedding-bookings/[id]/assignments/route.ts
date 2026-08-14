import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {sendMattEmail} from "@/lib/email";

const esc=(v:any)=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");

export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const auth=await createClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!user)return NextResponse.json({error:"Brak autoryzacji."},{status:401});
  const s=createAdminClient();
  const {data:profile}=await s.from("profiles").select("role").eq("id",user.id).single();
  if(!profile||!["admin","dispatcher"].includes(profile.role))return NextResponse.json({error:"Brak uprawnień."},{status:403});
  const body=await req.json();
  const rows=Array.isArray(body.assignments)?body.assignments:[];
  const {data:booking}=await s.from("wedding_bookings").select("*").eq("id",id).single();
  if(!booking)return NextResponse.json({error:"Nie znaleziono rezerwacji weselnej."},{status:404});

  for(const row of rows){
    const payload={wedding_booking_id:id,slot_no:Number(row.slotNo),requested_vehicle_type:row.requestedVehicleType==="car"?"car":"bus",driver_id:row.driverId||null,vehicle_id:row.vehicleId||null,updated_at:new Date().toISOString()};
    const {error}=await s.from("wedding_vehicle_assignments").upsert(payload,{onConflict:"wedding_booking_id,slot_no"});
    if(error)return NextResponse.json({error:error.message},{status:500});
  }
  const complete=rows.length===Number(booking.vehicles_count)&&rows.every((x:any)=>x.driverId&&x.vehicleId);
  let emailSent=false;
  if(complete&&booking.email){
    const driverIds=rows.map((x:any)=>x.driverId),vehicleIds=rows.map((x:any)=>x.vehicleId);
    const [{data:drivers},{data:vehicles}]=await Promise.all([
      s.from("drivers").select("id,full_name,phone").in("id",driverIds),
      s.from("vehicles").select("id,name,registration").in("id",vehicleIds)
    ]);
    const list=rows.map((x:any,i:number)=>{
      const d=(drivers??[]).find((z:any)=>z.id===x.driverId),v=(vehicles??[]).find((z:any)=>z.id===x.vehicleId);
      return `<div style="margin:14px 0;padding:16px;background:#fffaf2;border:1px solid #ead8b5;border-radius:14px"><strong style="color:#9b6b2d">Pojazd ${i+1}</strong><br>Kierowca: <b>${esc(d?.full_name)}</b><br>Telefon: ${esc(d?.phone||"—")}<br>Pojazd: <b>${esc(v?.name)}</b><br>Rejestracja: ${esc(v?.registration)}</div>`;
    }).join("");
    const result=await sendMattEmail({to:booking.email,subject:`💍 Wasz transport weselny jest przygotowany – ${booking.booking_number}`,html:`<div style="font-family:Georgia,serif;background:#f7f1e7;padding:32px;color:#3b3128"><div style="max-width:680px;margin:auto;background:#fffdf9;border:1px solid #e6d4b2;border-radius:22px;padding:30px"><div style="text-align:center;font-size:34px">💍</div><h1 style="text-align:center;color:#9b6b2d">Wasz transport weselny jest już przygotowany</h1><p style="text-align:center">MATT TRANSPORT · ${esc(booking.start_date)} ${esc(booking.start_time)}</p><p><b>${esc(booking.restaurant_name)}</b><br>${esc(booking.restaurant_address)}</p>${list}<p style="margin-top:22px;text-align:center">Życzymy pięknego dnia i spokojnej zabawy. O transport zadbamy my.</p><p style="text-align:center;color:#9b6b2d"><b>MATT TRANSPORT</b><br>+48 691 242 691</p></div></div>`});
    emailSent=result.sent;
  }
  return NextResponse.json({ok:true,email_sent:emailSent,complete});
}
