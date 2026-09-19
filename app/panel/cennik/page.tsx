import PanelNav from "@/components/PanelNav";
import AirportPricingManager from "@/components/AirportPricingManager";
import { panelClient } from "@/lib/panel";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAirportCatalog } from "@/lib/airportPricingServer";

export default async function AirportPricingPage() {
  await panelClient();
  const rows = await getAirportCatalog(createAdminClient(), { includeInactive: true });

  return (
    <main className="container">
      <span className="badge">MATT BOOKING PRO · CENNIK</span>
      <h1>Cennik lotnisk</h1>
      <PanelNav />
      <AirportPricingManager rows={rows} />
    </main>
  );
}
