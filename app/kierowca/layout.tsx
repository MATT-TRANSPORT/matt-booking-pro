import type { Metadata } from "next";
import PwaServiceWorker from "@/components/PwaServiceWorker";

export const metadata: Metadata = {
  title: "MATT Driver",
  description: "Panel kierowcy MATT TRANSPORT",
  manifest: "/pwa/driver.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MATT Driver"
  },
  icons: {
    apple: "/pwa/icon-192.png"
  }
};

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PwaServiceWorker />
      {children}
    </>
  );
}
