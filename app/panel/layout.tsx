import type { Metadata } from "next";
import PwaServiceWorker from "@/components/PwaServiceWorker";
import AdminPushControls from "@/components/AdminPushControls";

export const metadata: Metadata = {
  title: "MATT Administrator | MATT Booking PRO",
  description: "Panel administratora MATT TRANSPORT",
  manifest: "/pwa/admin.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MATT Administrator"
  },
  icons: {
    apple: "/pwa/icon-192.png"
  }
};

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PwaServiceWorker />
      {children}
      <AdminPushControls />
    </>
  );
}
