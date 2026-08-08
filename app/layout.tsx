import "./globals.css";
export const metadata = { title: "MATT Booking PRO", description: "MATT TRANSPORT" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pl"><body>{children}</body></html>;
}
