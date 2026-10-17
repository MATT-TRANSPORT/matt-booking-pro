import { resolveCustomerLocale } from "@/lib/localizedBookingEmails";
import { NextRequest,NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMattEmail } from "@/lib/email";
import { sendNewWeddingAdminPush } from "@/lib/adminNotifications";

export async function POST(req:NextRequest){
  const b=await req.json();
  const locale=resolveCustomerLocale(b.locale);
  const copy={
    pl:{subject:"Transport weselny – otrzymaliśmy dane",title:"Dziękujemy za przesłanie danych",intro:"Otrzymaliśmy informacje potrzebne do przygotowania umowy dotyczącej transportu weselnego.",next:"Przygotujemy umowę i prześlemy ją na ten adres e-mail. W razie potrzeby skontaktujemy się telefonicznie."},
    en:{subject:"Wedding transport – details received",title:"Thank you for your details",intro:"We have received the information needed to prepare your wedding transport agreement.",next:"We will prepare the agreement and email it to you. We may call if we need further information."},
    de:{subject:"Hochzeitstransport – Angaben erhalten",title:"Vielen Dank für Ihre Angaben",intro:"Wir haben die Informationen erhalten, die wir für Ihren Hochzeitstransportvertrag benötigen.",next:"Wir erstellen den Vertrag und senden ihn per E-Mail. Bei Rückfragen melden wir uns telefonisch."},
    cs:{subject:"Svatební doprava – údaje přijaty",title:"Děkujeme za zaslané údaje",intro:"Obdrželi jsme informace potřebné k přípravě smlouvy o svatební dopravě.",next:"Připravíme smlouvu a zašleme ji na váš e-mail. V případě dotazů vám zavoláme."}
  }[locale];
  const esc=(v:unknown)=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
  if(!b.customerName||!b.startDate||!b.startTime||!b.restaurantName||!b.restaurantAddress||!b.phone||!b.email)
    return NextResponse.json({error:{pl:"Uzupełnij wymagane pola.",en:"Please complete the required fields.",de:"Bitte füllen Sie alle Pflichtfelder aus.",cs:"Vyplňte povinná pole."}[locale]},{status:400});

  const s=createAdminClient();
  const {data,error}=await s.from("wedding_bookings").insert({
    customer_name:b.customerName,customer_locale:locale,start_date:b.startDate,start_time:b.startTime,
    restaurant_name:b.restaurantName,restaurant_address:b.restaurantAddress,
    vehicles_count:Number(b.vehiclesCount||1),phone:b.phone,email:b.email,notes:b.notes||null,status:"pending"
  }).select("*").single();

  if(error)return NextResponse.json({error:error.message},{status:500});

  const vehicleTypes=Array.isArray(b.vehicleTypes)?b.vehicleTypes:[];
  const slots=Array.from({length:Number(b.vehiclesCount||1)},(_,i)=>({
    wedding_booking_id:data.id,
    slot_no:i+1,
    requested_vehicle_type:vehicleTypes[i]==="car"?"car":"bus"
  }));
  if(slots.length) await s.from("wedding_vehicle_assignments").insert(slots);

  const configuredPanelUrl=String(process.env.NEXT_PUBLIC_PANEL_URL||"").trim().replace(/\/$/,"");
  const panelBase=configuredPanelUrl && !configuredPanelUrl.includes("vercel.app")
    ? configuredPanelUrl
    : "https://panel.matt-transport.pl";
  const adminUrl=`${panelBase}/panel/wesela/${data.id}`;

  await Promise.allSettled([
    sendMattEmail({
      to:b.email,
      locale,
      subject:`${copy.subject} ${data.booking_number}`,
      html:`<div style="font-family:Arial;background:#0b0e13;color:white;padding:28px"><div style="max-width:650px;margin:auto;background:#151923;padding:28px;border-radius:16px">
      <h2 style="color:#f1d28b">MATT TRANSPORT 💍</h2><h1>${esc(copy.title)}</h1>
      <p>${esc(copy.intro)}</p>
      <p><strong>${esc(data.start_date)} ${esc(data.start_time)}</strong><br>${esc(data.restaurant_name)}<br>${esc(data.restaurant_address)}</p>
      <p>${esc(copy.next)}</p></div></div>`
    }),
    sendMattEmail({
      to:"kontakt@matt-transport.pl",
      subject:`💍 NOWE WESELE ${data.booking_number}`,
      html:`<div style="font-family:Arial;background:#0b0e13;color:white;padding:28px"><div style="max-width:650px;margin:auto;background:#151923;padding:28px;border-radius:16px">
      <h2 style="color:#f1d28b">MATT TRANSPORT 💍</h2><h1>Nowe zapytanie weselne</h1>
      <p><strong>${data.customer_name}</strong> · ${data.phone} · ${data.email}</p>
      <p>${data.start_date} ${data.start_time}<br>${data.restaurant_name}<br>${data.restaurant_address}<br>Samochody: ${data.vehicles_count}</p>
      <p><a href="${adminUrl}" style="display:inline-block;background:#d5ae5d;color:#111;padding:14px 18px;border-radius:10px;text-decoration:none;font-weight:bold">OTWÓRZ W PANELU</a></p></div></div>`
    })
  ]);

  let adminPushResult:any=null;
  try{
    adminPushResult=await sendNewWeddingAdminPush(s,data);
  }catch(pushError){
    console.error("Admin push po nowym weselu:",pushError);
  }

  return NextResponse.json({
    ...data,
    admin_push_sent:Number(adminPushResult?.sent||0)
  });
}
