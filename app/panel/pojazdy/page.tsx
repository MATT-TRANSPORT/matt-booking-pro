import PanelNav from "@/components/PanelNav";
import VehiclesManager from "@/components/VehiclesManager";
import { panelClient } from "@/lib/panel";
export default async function Page(){const {s}=await panelClient();const {data}=await s.from("vehicles").select("*").order("name");return <main className="container"><h1>Pojazdy</h1><PanelNav/><VehiclesManager vehicles={data??[]}/></main>}
