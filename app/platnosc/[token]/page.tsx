import B2BEmployeePayment from "@/components/B2BEmployeePayment";

export default async function Page({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <B2BEmployeePayment token={token} />;
}
