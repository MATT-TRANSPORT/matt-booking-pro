import type { Metadata } from "next";
import PwaServiceWorker from "@/components/PwaServiceWorker";
import "./customer-trips.css";

export const metadata: Metadata = {
  title: "Moje przejazdy — MATT TRANSPORT",
  description: "Historia i najbliższe przejazdy MATT TRANSPORT.",
  manifest: "/pwa/customer.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MATT TRANSPORT"
  },
  icons: {
    apple: "/pwa/icon-192.png"
  }
};

export default function CustomerTripsLayout({ children }: { children: React.ReactNode }) {
  return <><PwaServiceWorker />{children}</>;
}
