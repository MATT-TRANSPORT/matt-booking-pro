export const REVIEW_DELAY_MINUTES = 45;

export function googleReviewUrl() {
  const configured = String(process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL || "").trim();
  if (configured) return configured;

  // Bezpieczny fallback działający bez dodatkowej konfiguracji.
  return "https://www.google.com/maps/search/?api=1&query=MATT%20TRANSPORT%20Rybnik%20Ko%C5%9Bcielna%2029";
}

export function reviewDue(completedAt: string | null | undefined, now = new Date()) {
  if (!completedAt) return false;
  const completed = new Date(completedAt).getTime();
  if (!Number.isFinite(completed)) return false;
  return now.getTime() - completed >= REVIEW_DELAY_MINUTES * 60_000;
}
