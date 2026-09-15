import type { Metadata } from "next";
import PwaServiceWorker from "@/components/PwaServiceWorker";
import "./customer-pwa.css";

export const metadata: Metadata = {
  title: "MATT TRANSPORT — rezerwacja transportu",
  description: "Zarezerwuj transport MATT TRANSPORT na Śląsku i transfer na lotnisko.",
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

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PwaServiceWorker />
      {children}
    </>
  );
}
