import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
export async function POST(req:NextRequest){
  const auth=await createClient();const {data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:"Brak autoryzacji."},{status:401});
  const admin=createAdminClient();const {data:p}=await admin.from("profiles").select("role").eq("id",user.id).single();
  if(!p||p.role!=="admin")return NextResponse.json({error:"Brak uprawnień."},{status:403});
  const b=await req.json();
  if(b.action==="create"){
    const {data,error}=await admin.from("companies").insert({
      name:b.name,nip:b.nip||null,email:b.email||null,phone:b.phone||null,contact_person:b.contactPerson||null,
      payment_days:Number(b.paymentDays||14),discount_percent:Number(b.discount||0),free_pickup_km:Number(b.freeKm||40),
      default_payment_method:b.defaultPayment||"company_transfer",internal_notes:b.notes||null,active:true
    }).select("*").single();
    if(error)return NextResponse.json({error:error.message},{status:500});return NextResponse.json(data);
  }
  if(b.action==="terms"){
    const {data,error}=await admin.from("companies").update({
      payment_days:Number(b.paymentDays),discount_percent:Number(b.discount),free_pickup_km:Number(b.freeKm),
      default_payment_method:b.defaultPayment,use_custom_pricing:Boolean(b.useCustomPricing),internal_notes:b.notes||null
    }).eq("id",b.id).select("*").single();
    if(error)return NextResponse.json({error:error.message},{status:500});return NextResponse.json(data);
  }
  return NextResponse.json({error:"Nieznana operacja."},{status:400});
}
