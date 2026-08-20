import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateB2BQuote } from "@/lib/b2bPricing";

export async function POST(req: NextRequest) {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });
  }

  const { data: membership } = await auth
    .from("company_users")
    .select("company_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Brak przypisanej firmy." }, { status: 403 });
  }

  const body = await req.json();

  try {
    const quote = await calculateB2BQuote(createAdminClient(), {
      companyId: membership.company_id,
      travelDate: body.travelDate || null,
      serviceType: body.serviceType,
      airport: body.airport,
      vehicleType: body.vehicleType,
      pickupAddress: body.address
    });

    return NextResponse.json(quote);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nie udało się obliczyć wyceny B2B."
      },
      { status: 400 }
    );
  }
}
