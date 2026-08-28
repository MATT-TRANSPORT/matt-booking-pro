import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { companyBookingMoney } from "@/lib/companyPortal";
import { statusPl } from "@/lib/status";

function monthRange(month: string) {
  const match = month.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const mon = Number(match[2]);
  if (mon < 1 || mon > 12) return null;
  const nextYear = mon === 12 ? year + 1 : year;
  const nextMonth = mon === 12 ? 1 : mon + 1;
  return {
    start: `${year}-${String(mon).padStart(2, "0")}-01`,
    end: `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`
  };
}

function csvCell(value: unknown) {
  let text = String(value ?? "").replace(/\r?\n/g, " ").trim();
  // Ochrona przed CSV/Excel formula injection.
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function routeText(b: any) {
  if (b.service_type === "from_airport") return `${b.airport_label} → ${b.pickup_address}`;
  if (b.service_type === "roundtrip") return `${b.pickup_address} ↔ ${b.airport_label}`;
  return `${b.pickup_address} → ${b.airport_label}`;
}

function paymentText(value: string) {
  const map: Record<string, string> = {
    cash: "Gotówka",
    transfer: "Przelew",
    online: "Online",
    company_transfer: "Przelew firmowy",
    employee_payment: "Płatność online firmy"
  };
  return map[value] || value || "—";
}

function paymentStatusText(value: string) {
  const map: Record<string, string> = {
    pending: "Oczekuje",
    paid: "Opłacono",
    failed: "Nieudana",
    refunded: "Zwrot",
    review: "Do weryfikacji"
  };
  return map[value] || value || "—";
}

export async function GET(req: NextRequest) {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "dispatcher", "accounting"].includes(profile.role)) {
    return NextResponse.json({ error: "Brak uprawnień." }, { status: 403 });
  }

  const month = req.nextUrl.searchParams.get("month") || "";
  const range = monthRange(month);
  if (!range) return NextResponse.json({ error: "Podaj miesiąc w formacie RRRR-MM." }, { status: 400 });

  const allRows: any[] = [];
  const pageSize = 1000;
  for (let offset = 0; offset < 10000; offset += pageSize) {
    const { data, error } = await admin
      .from("bookings")
      .select("*,companies(name),drivers:drivers!bookings_driver_id_fkey(full_name),vehicles:vehicles!bookings_vehicle_id_fkey(name,registration)")
      .gte("travel_date", range.start)
      .lt("travel_date", range.end)
      .neq("status", "cancelled")
      .order("travel_date")
      .order("travel_time")
      .range(offset, offset + pageSize - 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    allRows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }

  const headers = [
    "Numer rezerwacji", "Data", "Godzina", "Typ", "Klient / pasażer", "Firma",
    "Trasa", "Pojazd", "Kierowca", "Status", "Płatność", "Status płatności",
    "Netto", "VAT", "Brutto", "Faktura", "Źródło systemowe", "Źródło Growth", "UTM kampania", "Partner / kod"
  ];

  const rows = allRows.map((b: any) => {
    const company = Array.isArray(b.companies) ? b.companies[0] : b.companies;
    const driver = Array.isArray(b.drivers) ? b.drivers[0] : b.drivers;
    const assignedVehicle = Array.isArray(b.vehicles) ? b.vehicles[0] : b.vehicles;
    const money = b.company_id
      ? companyBookingMoney(b)
      : { net: "", vat: "", gross: Number(b.total_price || 0) };
    return [
      b.booking_number,
      b.travel_date,
      String(b.travel_time || "").slice(0, 5),
      b.company_id ? "B2B" : "B2C",
      b.customer_name,
      company?.name || "",
      routeText(b),
      assignedVehicle
        ? `${assignedVehicle.name || ""}${assignedVehicle.registration ? ` (${assignedVehicle.registration})` : ""}`
        : (b.vehicle_type === "bus" ? "Bus" : "Samochód"),
      driver?.full_name || "",
      statusPl(b.status),
      paymentText(b.payment_method),
      paymentStatusText(b.payment_status),
      typeof money.net === "number" ? money.net.toFixed(2) : "",
      typeof money.vat === "number" ? money.vat.toFixed(2) : "",
      Number(money.gross || 0).toFixed(2),
      b.invoice_number || "",
      b.booking_source || "",
      b.acquisition_source || "",
      b.utm_campaign || "",
      b.referral_code || ""
    ];
  });

  const csv = "\uFEFF" + [headers, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="MATT_TRANSPORT_${month}.csv"`,
      "Cache-Control": "no-store"
    }
  });
}
