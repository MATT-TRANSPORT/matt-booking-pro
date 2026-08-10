import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PRICES, calculateQuote } from "@/lib/pricing";
export async function POST(req: NextRequest) {
  const body=await req.json();
  const required=["serviceType","address","airport","travelDate","travelTime","customerName","phone","email"];
  for(const k of required) if(!body[k]) return NextResponse.json({error:"Uzupełnij wymagane pola."},{status:400});
  if(!PRICES[body.airport]) return NextResponse.json({error:"Nieprawidłowe lotnisko."},{status:400});
  if(Number(body.passengers)>3 && body.vehicleType!=="bus") return NextResponse.json({error:"Dla więcej niż 3 pasażerów wybierz bus."},{status:400});
  const when=new Date(`${body.travelDate}T${body.travelTime}`);
  if(when.getTime()-Date.now()<48*3600*1000) return NextResponse.json({error:"Rezerwacja online wymaga minimum 48 godzin wyprzedzenia. Zadzwoń: +48 691 242 691"},{status:400});
  const q=calculateQuote({serviceType:body.serviceType,airport:body.airport,vehicleType:body.vehicleType,distanceKm:Number(body.distanceKm),invoiceRequired:Boolean(body.invoiceRequired)});
  const supabase=await createClient();
  const {data,error}=await supabase.from("bookings").insert({
    service_type:body.serviceType,pickup_address:body.address,airport_key:body.airport,airport_label:PRICES[body.airport].label,
    travel_date:body.travelDate,travel_time:body.travelTime,return_date:body.returnDate||null,return_time:body.returnTime||null,
    passengers:Number(body.passengers),vehicle_type:body.vehicleType==="bus"?"bus":"car",distance_km:Number(body.distanceKm),customer_name:body.customerName,
    phone:body.phone,email:body.email,invoice_required:Boolean(body.invoiceRequired),company_name:body.companyName||null,company_nip:body.companyNip||null,
    company_address:body.companyAddress||null,flight_number:body.flightNumber||null,return_flight_number:body.returnFlightNumber||null,
    base_price:q.basePrice,extra_price:q.extraPrice,vat_price:q.vatPrice,total_price:q.totalPrice,status:"pending",notes:body.notes||null
  }).select("id,booking_number,total_price,status").single();
  if(error) return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json(data);
}
