import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin","accounting"].includes(profile.role)) {
    return NextResponse.json({ error: "Brak uprawnień." }, { status: 403 });
  }

  const form = await req.formData();
  const companyId = String(form.get("companyId") || "");
  const period = String(form.get("period") || "");
  const invoiceNumber = String(form.get("invoiceNumber") || "");
  const file = form.get("file");

  if (!companyId || !period || !invoiceNumber || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Uzupełnij firmę, miesiąc, numer faktury i plik." },
      { status: 400 }
    );
  }

  const allowed = ["application/pdf","image/jpeg","image/png"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json(
      { error: "Dozwolone formaty: PDF, JPG, PNG." },
      { status: 400 }
    );
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Plik może mieć maksymalnie 10 MB." },
      { status: 400 }
    );
  }

  const start = `${period}-01`;
  const d = new Date(`${period}-01T00:00:00`);
  d.setMonth(d.getMonth() + 1);
  const end = d.toISOString().slice(0, 10);

  const { data: bookings } = await admin
    .from("bookings")
    .select("total_price")
    .eq("company_id", companyId)
    .gte("travel_date", start)
    .lt("travel_date", end)
    .eq("status", "completed");

  const amount = (bookings ?? []).reduce(
    (sum: number, x: any) => sum + Number(x.total_price || 0),
    0
  );

  const periodDate = start;

  const { data: settlement, error: settlementError } = await admin
    .from("company_settlements")
    .upsert(
      {
        company_id: companyId,
        period_month: periodDate,
        amount,
        invoice_number: invoiceNumber,
        status: "invoiced",
        updated_at: new Date().toISOString()
      },
      { onConflict: "company_id,period_month" }
    )
    .select("*")
    .single();

  if (settlementError) {
    return NextResponse.json(
      { error: settlementError.message },
      { status: 500 }
    );
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${companyId}/${settlement.id}/${safeName}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await admin.storage
    .from("company-invoices")
    .upload(path, bytes, {
      contentType: file.type,
      upsert: true
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  await admin
    .from("company_settlements")
    .update({ invoice_file_path: path })
    .eq("id", settlement.id);

  return NextResponse.json({
    ok: true,
    settlement_id: settlement.id,
    amount
  });
}
