/** Server-only safeguards for the isolated booking test environment. */
export function isTestEnvironment(): boolean {
  if (process.env.MATT_TEST_MODE !== "1") return false;
  if (process.env.VERCEL_ENV === "production") {
    throw new Error("Test mode must not be enabled on production.");
  }
  return true;
}

export function assertTestDatabase(url: string): void {
  if (!isTestEnvironment()) return;
  const project = process.env.MATT_TEST_SUPABASE_PROJECT_REF;
  if (!project || new URL(url).hostname !== `${project}.supabase.co`) {
    throw new Error("Test mode requires the configured isolated Supabase project.");
  }
}

export function assertSafeStripeKey(key: string): void {
  if ((process.env.VERCEL_ENV === "preview" || isTestEnvironment()) &&
      !/^(sk|rk)_test_/.test(key)) {
    throw new Error("Preview payments require a Stripe test-mode key.");
  }
}
