import "server-only";

export type Earnings = { symbol: string; date: string; hour: "bmo" | "amc" | "dmh" | "" };

/** True once the free Finnhub key is set in the hosting settings. */
export function earningsConfigured() {
  return !!process.env.MARKET_DATA_API_KEY;
}

/**
 * Earnings dates from Finnhub's free calendar for the given tickers.
 * Returns null when there's no key or the service is down, so the page still works.
 */
export async function earningsBetween(from: string, to: string, tickers: string[]): Promise<Earnings[] | null> {
  const key = process.env.MARKET_DATA_API_KEY;
  if (!key) return null;
  const want = new Set(tickers.map((t) => t.toUpperCase()));
  try {
    const url = `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${encodeURIComponent(key)}`;
    const res = await fetch(url, { next: { revalidate: 6 * 60 * 60 }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const body = (await res.json()) as { earningsCalendar?: { symbol?: string; date?: string; hour?: string }[] };
    return (body.earningsCalendar ?? [])
      .filter((e) => e.symbol && e.date && want.has(e.symbol.toUpperCase()))
      .map((e) => ({ symbol: e.symbol!.toUpperCase(), date: e.date!, hour: (["bmo", "amc", "dmh"].includes(e.hour ?? "") ? e.hour : "") as Earnings["hour"] }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return null;
  }
}
