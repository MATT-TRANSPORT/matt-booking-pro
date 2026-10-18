import { customerJson, requestCustomerLocale } from "@/lib/customerErrors";
import { NextRequest,NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req:NextRequest){
  let responseLocale=requestCustomerLocale(req);
  const json=(payload:any,init?:ResponseInit)=>customerJson(responseLocale,payload,init);
  const s=await createClient();
  const {data:{user}}=await s.auth.getUser();
  if(!user) return json({error:"Brak autoryzacji."},{status:401});
  const {data:m}=await s.from("company_users").select("company_id,role").eq("user_id",user.id).eq("active",true).single();
  if(!m) return json({error:"Brak firmy."},{status:403});
  const b=await req.json();
 responseLocale=requestCustomerLocale(req,b?.locale);

  if(b.action==="create"){
    if(!["admin","manager"].includes(m.role)) return json({error:"Brak uprawnień."},{status:403});
    const {data,error}=await s.from("company_employees").insert({
      company_id:m.company_id,first_name:b.firstName,last_name:b.lastName,
      phone:b.phone||null,email:b.email||null,default_address:b.defaultAddress||null,
      department:b.department||null,active:true
    }).select().single();
    if(error) return json({error:error.message},{status:500});
    return json(data);
  }

  if(b.action==="toggle"){
    if(!["admin","manager"].includes(m.role)) return json({error:"Brak uprawnień."},{status:403});
    const {data,error}=await s.from("company_employees").update({active:Boolean(b.active)}).eq("id",b.id).eq("company_id",m.company_id).select().single();
    if(error) return json({error:error.message},{status:500});
    return json(data);
  }

  return json({error:"Nieznana operacja."},{status:400});
}
