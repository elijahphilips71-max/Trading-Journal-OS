import { addDays } from "./maths/dates";
import { isMarketHoliday } from "./market/holidays";

export type Trend = "up" | "sideways" | "down";
export type Zone = "discount" | "premium";
export type Verdict = { key: "buys" | "wait" | "picky" | "sit_out"; title: string; tone: "ok" | "warn" | "bad"; why: string };

/** Step 1 bias: turn the daily read into one plain answer. */
export function biasVerdict(trend: Trend | null, zone: Zone | null, oldLow?: number | null): Verdict | null {
  if (!trend || !zone) return null;
  const low = oldLow ? ` at $${oldLow.toFixed(2)}` : "";
  if (trend === "up" && zone === "discount")
    return { key: "buys", title: "Look for buys", tone: "ok", why: `Trend is up and price is cheap. Watch for a sweep of the old low${low}, then go to Step 2.` };
  if (trend === "up")
    return { key: "wait", title: "Wait", tone: "warn", why: "Trend is up but price is expensive. Wait for it to drop into the bottom half before looking for buys." };
  if (trend === "sideways" && zone === "discount")
    return { key: "picky", title: "Be picky", tone: "warn", why: `No clear direction. Only a clean sweep of the old low${low} counts. Otherwise sit out.` };
  if (trend === "sideways")
    return { key: "sit_out", title: "Sit out", tone: "bad", why: "No direction and price is expensive. Nothing to do today, and that's fine." };
  return { key: "sit_out", title: "Sit out", tone: "bad", why: "Trend is down. Short selling comes later. For now, no buys against the trend." };
}

export function isWeekend(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return dow === 0 || dow === 6;
}

export function isTradingDay(day: string) {
  return !isWeekend(day) && !isMarketHoliday(day);
}

/** The next US trading day strictly after `day`. */
export function nextTradingDay(day: string) {
  let d = addDays(day, 1);
  while (!isTradingDay(d)) d = addDays(d, 1);
  return d;
}

/** Which day a bias plan is for: today if it's a trading day and before the US close (21:00 UK), else the next one. */
export function planDay(today: string, londonHour: number) {
  if (isTradingDay(today) && londonHour < 21) return today;
  return nextTradingDay(today);
}
