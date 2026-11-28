import { isMarketHoliday } from "./holidays";

/**
 * Big scheduled US news days, built in so the app works without a paid data feed.
 * Times are New York time. Update the Fed dates once a year from federalreserve.gov.
 */
export type MarketEvent = {
  day: string;
  /** New York time, HH:MM. */
  timeNy: string;
  title: string;
  impact: "High" | "Medium" | "Low";
  explain: string;
  /** True when the date follows the usual pattern rather than an official list. */
  estimated?: boolean;
};

/** Fed (FOMC) interest rate decisions, announced at 2pm New York time. */
export const FOMC_DECISIONS = ["2026-01-28", "2026-03-18", "2026-04-29", "2026-06-17", "2026-07-29", "2026-09-16", "2026-10-28", "2026-12-09"];

const FED = {
  timeNy: "14:00",
  title: "Fed interest rate decision",
  impact: "High" as const,
  explain: "The US central bank sets interest rates. Prices can jump both ways in seconds, then the Fed chair speaks 30 minutes later.",
};

const JOBS = {
  timeNy: "08:30",
  title: "US jobs report",
  impact: "High" as const,
  explain: "How many jobs the US added last month. It comes out before the market opens, so the first hour can be wild.",
};

/** The jobs report usually comes out on the first Friday of the month (a day earlier if that Friday is a market holiday). */
export function jobsReportDay(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const toFriday = (5 - first.getUTCDay() + 7) % 7;
  const friday = new Date(Date.UTC(y, m - 1, 1 + toFriday));
  let day = friday.toISOString().slice(0, 10);
  if (isMarketHoliday(day)) day = new Date(friday.getTime() - 86400000).toISOString().slice(0, 10);
  return day;
}

export function eventsOn(day: string): MarketEvent[] {
  const out: MarketEvent[] = [];
  if (jobsReportDay(day.slice(0, 7)) === day) out.push({ day, ...JOBS, estimated: true });
  if (FOMC_DECISIONS.includes(day)) out.push({ day, ...FED });
  return out;
}
