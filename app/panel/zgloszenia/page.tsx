import PanelNav from "@/components/PanelNav";
import DriverIssuesAdmin from "@/components/DriverIssuesAdmin";
import { panelClient } from "@/lib/panel";

export default async function DriverIssuesPage() {
  const { s } = await panelClient();
  const { data } = await s.from("driver_issue_reports")
    .select("*,drivers(full_name),bookings(booking_number),vehicles(name,registration)")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = await Promise.all((data ?? []).map(async (x: any) => {
    let photoUrl: string | null = null;
    if (x.photo_path) {
      const { data: signed } = await s.storage.from("driver-issues").createSignedUrl(x.photo_path, 60 * 30);
      photoUrl = signed?.signedUrl || null;
    }
    return { ...x, photo_url: photoUrl };
  }));

  return <main className="container">
    <span className="badge">MATT OPERATIONS+</span>
    <h1>Zgłoszenia kierowców</h1>
    <PanelNav />
    <p className="muted">Problemy z pojazdem, realizacją kursu, zdjęcia i aktualizacje przebiegu.</p>
    <DriverIssuesAdmin issues={rows} />
  </main>;
}
