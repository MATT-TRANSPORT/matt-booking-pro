import PanelNav from "@/components/PanelNav";
import DriversManager from "@/components/DriversManager";
import { panelClient } from "@/lib/panel";
export default async function Page(){const {s}=await panelClient();const {data}=await s.from("drivers").select("*").order("full_name");return <main className="container"><h1>Kierowcy</h1><PanelNav/><DriversManager drivers={data??[]}/></main>}
