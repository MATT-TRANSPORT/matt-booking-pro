import { NextRequest,NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMattEmail } from "@/lib/email";

export async function POST(req:NextRequest){
  const b=await req.json();
  if(!b.customerName||!b.startDate||!b.startTime||!b.restaurantName||!b.restaurantAddress||!b.phone||!b.email)
    return NextResponse.json({error:"Uzupełnij wymagane pola."},{status:400});

  const s=createAdminClient();
  const {data,error}=await s.from("wedding_bookings").insert({
    customer_name:b.customerName,start_date:b.startDate,start_time:b.startTime,
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

  const base=process.env.NEXT_PUBLIC_APP_URL||"https://matt-booking-pro.vercel.app";
  const adminUrl=`${base}/panel/wesela/${data.id}`;

  await Promise.allSettled([
    sendMattEmail({
      to:b.email,
      subject:`Transport weselny – otrzymaliśmy dane ${data.booking_number}`,
      html:`<div style="font-family:Arial;background:#0b0e13;color:white;padding:28px"><div style="max-width:650px;margin:auto;background:#151923;padding:28px;border-radius:16px">
      <h2 style="color:#f1d28b">MATT TRANSPORT 💍</h2><h1>Dziękujemy za przesłanie danych</h1>
      <p>Otrzymaliśmy informacje potrzebne do przygotowania umowy dotyczącej transportu weselnego.</p>
      <p><strong>${data.start_date} ${data.start_time}</strong><br>${data.restaurant_name}<br>${data.restaurant_address}</p>
      <p>Przygotujemy umowę i prześlemy ją na ten adres e-mail. W razie potrzeby skontaktujemy się telefonicznie.</p></div></div>`
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
  return NextResponse.json(data);
}
