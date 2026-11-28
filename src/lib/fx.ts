import "server-only";

/** Used if the free rate service can't be reached. Roughly GBP→USD in late 2026. */
export const FALLBACK_FX = 1.27;

/**
 * Today's GBP→USD rate (dollars per £1) from the free ECB-based Frankfurter API.
 * Cached for 12 hours. Falls back to a fixed rate so logging never breaks.
 */
export async function gbpUsdRate(): Promise<{ rate: number; live: boolean }> {
  try {
    const res = await fetch("https://api.frankfurter.dev/v1/latest?base=GBP&symbols=USD", {
      next: { revalidate: 60 * 60 * 12 },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const json = (await res.json()) as { rates?: { USD?: number } };
    const rate = Number(json.rates?.USD);
    if (!Number.isFinite(rate) || rate < 0.5 || rate > 3) throw new Error("bad rate");
    return { rate, live: true };
  } catch {
    return { rate: FALLBACK_FX, live: false };
  }
}
