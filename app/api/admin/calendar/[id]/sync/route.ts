import {
  NextResponse
} from "next/server";
import { apiAdmin } from "@/lib/apiAdmin";
import {
  syncBookingCalendar
} from "@/lib/googleCalendar";

export async function POST(
  _req: Request,
  {
    params
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const { id } = await params;

  const session =
    await apiAdmin();

  if ("error" in session) {
    return NextResponse.json(
      {
        error: session.error
      },
      {
        status: session.status
      }
    );
  }

  const result =
    await syncBookingCalendar(
      session.admin,
      id
    );

  if (
    result.configured &&
    !result.synced &&
    !result.waitingForAssignment
  ) {
    return NextResponse.json(
      {
        error:
          result.error ||
          "Nie udało się zsynchronizować kalendarza.",
        ...result
      },
      {
        status: 500
      }
    );
  }

  return NextResponse.json(
    result
  );
}
