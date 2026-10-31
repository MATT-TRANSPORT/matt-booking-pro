import { customerJson, requestCustomerLocale } from "@/lib/customerErrors";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateCompanyQuote } from "@/lib/companyPricing";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let responseLocale=requestCustomerLocale(req);
  const json=(payload:any,init?:ResponseInit)=>customerJson(responseLocale,payload,init);
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();

  if (!user) {
    return json({ error: "Brak autoryzacji." }, { status: 401 });
  }

  const { data: membership } = await auth
    .from("company_users")
    .select("company_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .single();

  if (!membership) {
    return json({ error: "Brak przypisanej firmy." }, { status: 403 });
  }

  const body = await req.json();
 responseLocale=requestCustomerLocale(req,body?.locale);

  try {
    const quote = await calculateCompanyQuote(createAdminClient(), {
      companyId: membership.company_id,
      pickupAddress: String(body.address || ""),
      airportKey: String(body.airport || ""),
      vehicleType: String(body.vehicleType || "car"),
      serviceType: String(body.serviceType || "to_airport"),
      termsId: body.termsId ? String(body.termsId) : null,
      ...(body.routeStops !== undefined ? { routeStops: body.routeStops } : {}),
      additionalStopAddress: body.additionalStopAddress ? String(body.additionalStopAddress) : null,
      additionalStopPrimary: Boolean(body.additionalStopPrimary),
      additionalStopReturn: Boolean(body.additionalStopReturn)
    });

    return json(quote);
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nie udało się przygotować wyceny B2B."
      },
      { status: 400 }
    );
  }
}
