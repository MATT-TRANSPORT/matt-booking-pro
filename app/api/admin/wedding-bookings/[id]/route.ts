import { NextRequest, NextResponse } from "next/server";
import { apiAdmin } from "@/lib/apiAdmin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await apiAdmin();

  if ("error" in session) {
    return NextResponse.json(
      { error: session.error },
      { status: session.status }
    );
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");

  const { data: booking } = await session.admin
    .from("wedding_bookings")
    .select("*")
    .eq("id", id)
    .single();

  if (!booking) {
    return NextResponse.json(
      { error: "Nie znaleziono transportu weselnego." },
      { status: 404 }
    );
  }

  if (action === "confirm") {
    if (booking.status !== "pending") {
      return NextResponse.json(
        { error: "Ten transport nie oczekuje już na akceptację." },
        { status: 409 }
      );
    }

    const { error } = await session.admin
      .from("wedding_bookings")
      .update({
        status: "confirmed",
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, status: "confirmed" });
  }

  if (action === "delete") {
    if (booking.status !== "pending") {
      return NextResponse.json(
        {
          error:
            "Można trwale usunąć tylko transport weselny, który nie został jeszcze zaakceptowany."
        },
        { status: 409 }
      );
    }

    const { error } = await session.admin
      .from("wedding_bookings")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, deleted: true });
  }

  return NextResponse.json(
    { error: "Nieznana operacja." },
    { status: 400 }
  );
}
