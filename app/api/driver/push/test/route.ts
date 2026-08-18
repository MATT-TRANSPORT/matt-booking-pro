import { NextResponse } from "next/server";
import { driverClient } from "@/lib/driver";
import { sendDriverPush } from "@/lib/pushServer";

export async function POST() {
  const { admin, driver } =
    await driverClient();

  try {
    const result = await sendDriverPush(
      admin,
      driver.id,
      {
        title: "🔔 MATT DRIVER",
        body:
          "Powiadomienia działają poprawnie na tym telefonie.",
        url: "/kierowca",
        tag: "matt-push-test",
        eventKey:
          `test:${driver.id}:${Date.now()}`,
        force: true
      }
    );

    return NextResponse.json({
      ok: true,
      ...result
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nie udało się wysłać testu."
      },
      { status: 500 }
    );
  }
}
