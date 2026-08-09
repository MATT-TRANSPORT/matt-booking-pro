import { NextResponse } from "next/server";
export async function GET(){
  const configured = Boolean(process.env.PAYMENT_PROVIDER_API_KEY);
  return NextResponse.json({module:"payment", configured, status:configured?"ready_for_adapter":"waiting_for_api_key"});
}
