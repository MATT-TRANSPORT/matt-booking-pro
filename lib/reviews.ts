export const REVIEW_DELAY_MINUTES = 45;

export const MATT_GOOGLE_REVIEW_URL = "https://g.page/r/Ce8RDPaWkNhrEBE/review";

export function googleReviewUrl() {
  const configured = String(process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL || "").trim();

  // Akceptujemy tylko bezpośredni link do formularza opinii.
  // Stare linki do wyszukiwarki / map nie mogą już przejąć fallbacku.
  if (configured && /\/review(?:[/?#]|$)/i.test(configured)) return configured;
  return MATT_GOOGLE_REVIEW_URL;
}

export function reviewDue(completedAt: string | null | undefined, now = new Date()) {
  if (!completedAt) return false;
  const completed = new Date(completedAt).getTime();
  if (!Number.isFinite(completed)) return false;
  return now.getTime() - completed >= REVIEW_DELAY_MINUTES * 60_000;
}
