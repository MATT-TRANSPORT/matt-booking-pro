export type GrowthTracking = {
  acquisitionSource: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  gclid: string | null;
  fbclid: string | null;
  referralCode: string | null;
  landingPage: string | null;
  capturedAt: string;
};

const STORAGE_KEY = "matt_growth_touch_v1";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function clean(value: string | null | undefined, max = 240) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function normalizedSource(input: {
  utmSource?: string | null;
  utmMedium?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
  referralCode?: string | null;
  referrerHost?: string | null;
}) {
  const source = clean(input.utmSource, 80)?.toLowerCase() ?? null;
  const medium = clean(input.utmMedium, 80)?.toLowerCase() ?? null;
  const host = clean(input.referrerHost, 160)?.toLowerCase() ?? null;

  if (clean(input.referralCode, 100)) return "partner";
  if (clean(input.gclid, 200)) return "google_ads";
  if (clean(input.fbclid, 200)) return "meta_ads";

  if (source) {
    if (source.includes("google") && ["cpc", "ppc", "paid", "paid_search"].includes(medium ?? "")) return "google_ads";
    if (source.includes("google") && medium === "organic") return "google_organic";
    if (["facebook", "fb", "instagram", "ig", "meta"].includes(source) && ["cpc", "paid", "paid_social"].includes(medium ?? "")) return "meta_ads";
    if (["facebook", "fb", "instagram", "ig", "meta"].includes(source)) return "social_organic";
    return source.slice(0, 80);
  }

  if (host) {
    if (host.includes("google.")) return "google_organic";
    if (host.includes("facebook.com") || host.includes("instagram.com") || host.includes("l.facebook.com")) return "social_organic";
    if (host.includes("matt-transport.pl")) return "matt_website";
    return "referral";
  }

  return "direct";
}

export function captureGrowthTracking() {
  if (typeof window === "undefined") return null;

  const url = new URL(window.location.href);
  const p = url.searchParams;
  const referrerHost = (() => {
    try { return document.referrer ? new URL(document.referrer).hostname : null; }
    catch { return null; }
  })();

  const utmSource = clean(p.get("utm_source"), 120);
  const utmMedium = clean(p.get("utm_medium"), 120);
  const utmCampaign = clean(p.get("utm_campaign"), 180);
  const utmContent = clean(p.get("utm_content"), 180);
  const utmTerm = clean(p.get("utm_term"), 180);
  const gclid = clean(p.get("gclid"), 240);
  const fbclid = clean(p.get("fbclid"), 240);
  const referralCode = clean(p.get("ref") || p.get("referral") || p.get("referral_code"), 120);

  const hasExplicitTouch = Boolean(
    utmSource || utmMedium || utmCampaign || utmContent || utmTerm || gclid || fbclid || referralCode
  );

  let existing: GrowthTracking | null = null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GrowthTracking;
      const age = Date.now() - Date.parse(parsed.capturedAt || "");
      if (Number.isFinite(age) && age >= 0 && age <= MAX_AGE_MS) existing = parsed;
      else window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {}

  // Last non-direct attribution: an explicit campaign/referral replaces the previous touch.
  // A normal direct visit never erases a campaign captured during the last 30 days.
  if (!hasExplicitTouch && existing) return existing;

  const inferredFromReferrer = !hasExplicitTouch && Boolean(referrerHost && !referrerHost.includes(window.location.hostname));
  if (!hasExplicitTouch && !inferredFromReferrer && existing) return existing;

  const tracking: GrowthTracking = {
    acquisitionSource: normalizedSource({ utmSource, utmMedium, gclid, fbclid, referralCode, referrerHost }),
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
    gclid,
    fbclid,
    referralCode,
    landingPage: clean(`${url.pathname}${url.search}`, 500),
    capturedAt: new Date().toISOString()
  };

  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tracking)); } catch {}
  return tracking;
}

export function readGrowthTracking(): GrowthTracking | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return captureGrowthTracking();
    const parsed = JSON.parse(raw) as GrowthTracking;
    const age = Date.now() - Date.parse(parsed.capturedAt || "");
    if (!Number.isFinite(age) || age < 0 || age > MAX_AGE_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return captureGrowthTracking();
    }
    return parsed;
  } catch {
    return captureGrowthTracking();
  }
}


export function clearGrowthTracking() {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
}

export function growthSourceLabel(source?: string | null) {
  const value = String(source || "").trim().toLowerCase();
  const labels: Record<string, string> = {
    google_ads: "Google Ads",
    google_organic: "Google organic / Maps",
    meta_ads: "Meta Ads (Facebook / Instagram)",
    social_organic: "Facebook / Instagram organic",
    partner: "Partner / polecenie",
    matt_website: "Strona MATT-TRANSPORT.PL",
    referral: "Strona polecająca",
    direct: "Wejście bezpośrednie",
    b2b_portal: "Portal firmy B2B",
    legacy: "Starsza rezerwacja (bez trackingu)"
  };
  return labels[value] || (source ? String(source) : "Brak danych");
}
