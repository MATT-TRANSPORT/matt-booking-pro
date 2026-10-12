import PanelNav from "@/components/PanelNav";
import AdminStripePaymentLauncher from "@/components/AdminStripePaymentLauncher";
import { panelClient } from "@/lib/panel";

export default async function StripePaymentPage() {
  const { s } = await panelClient();

  const [{ data: bookings }, { data: weddings }, { data: recent }] = await Promise.all([
    s.from("bookings")
      .select("id,booking_number,customer_name,email,company_id,total_price,price_gross,status,payment_status")
      .not("status", "in", "(completed,cancelled)")
      .order("travel_date")
      .limit(300),
    s.from("wedding_bookings")
      .select("id,booking_number,customer_name,email,start_date,start_time,status")
      .not("status", "in", "(completed,cancelled)")
      .order("start_date")
      .order("start_time")
      .limit(100),
    s.from("admin_stripe_payments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)
  ]);

  const references = [
    ...(bookings ?? []).map((b: any) => ({
      key: `booking:${b.id}`,
      type: "booking" as const,
      id: b.id,
      label: `${b.booking_number} · ${b.customer_name}`,
      email: b.email,
      amount: Number(b.company_id ? (b.price_gross ?? b.total_price ?? 0) : (b.total_price ?? 0))
    })),
    ...(weddings ?? []).map((w: any) => ({
      key: `wedding:${w.id}`,
      type: "wedding" as const,
      id: w.id,
      label: `💍 ${w.booking_number} · ${w.customer_name}`,
      email: w.email,
      amount: null
    }))
  ];

  return (
    <main className="container">
      <span className="badge">PŁATNOŚCI</span>
      <h1>Stripe · płatność ręczna</h1>
      <p className="muted">
        Szybkie uruchomienie płatności na dowolną kwotę z poziomu Panelu MATT.
      </p>
      <PanelNav />
      <AdminStripePaymentLauncher references={references} recent={recent ?? []} />
    </main>
  );
}
