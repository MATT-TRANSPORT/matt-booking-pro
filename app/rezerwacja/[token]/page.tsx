import ClientBookingPortal from "@/components/ClientBookingPortal";

export default async function Page({
  params
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params;
  return <ClientBookingPortal token={token} />;
}
