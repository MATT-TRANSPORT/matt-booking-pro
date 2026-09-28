import { NextRequest, NextResponse } from "next/server";
import { driverFromBearerRequest } from "@/lib/driverMobileAuth";
import { getStripe } from "@/lib/stripeServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await driverFromBearerRequest(req);

  if (!auth) {
    return NextResponse.json({ error: "Brak autoryzacji kierowcy." }, { status: 401 });
  }

  try {
    const stripe = getStripe();
    const location =
      process.env.STRIPE_TERMINAL_LOCATION_ID || "tml_GrarABsrx26Go1";

    const token = await stripe.terminal.connectionTokens.create(
      location ? { location } : {}
    );

    return NextResponse.json({ secret: token.secret });
  } catch (error) {
    console.error("Stripe Terminal connection token:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się przygotować terminala." },
      { status: 500 }
    );
  }
}
