import ClientBookingPortal from "@/components/ClientBookingPortal";
import ClientOperationalStatus from "@/components/ClientOperationalStatus";

export default async function Page({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <>
    <ClientOperationalStatus token={token} />
    <ClientBookingPortal token={token} />
  </>;
}
