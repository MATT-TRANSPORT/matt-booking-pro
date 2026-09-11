import BookingReviewForm from "@/components/BookingReviewForm";

export default async function ReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <BookingReviewForm token={token} />;
}
