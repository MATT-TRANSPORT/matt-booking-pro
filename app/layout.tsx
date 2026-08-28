import type { Metadata, Viewport } from "next";
import "./globals.css";
import GrowthTracker from "@/components/GrowthTracker";

export const metadata: Metadata = {
  title: "MATT Booking PRO",
  description: "MATT TRANSPORT",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MATT Driver"
  },
  icons: {
    apple: "/pwa/icon-192.png"
  }
};

export const viewport: Viewport = {
  themeColor: "#090b10",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <body><GrowthTracker />{children}</body>
    </html>
  );
}
