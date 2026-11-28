/** Date helpers that work on plain "YYYY-MM-DD" day strings (UK calendar days). */

const londonFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The UK calendar day (YYYY-MM-DD) for a moment in time. */
export function londonDay(at: string | Date): string {
  return londonFmt.format(typeof at === "string" ? new Date(at) : at);
}

function parse(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Add whole months, clamping to the month's last day (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(day: string, months: number): string {
  const d = parse(day);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d.getUTCDate(), lastDay));
  return fmt(target);
}

export function addDays(day: string, days: number): string {
  const d = parse(day);
  d.setUTCDate(d.getUTCDate() + days);
  return fmt(d);
}

/** Whole days from a to b (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86_400_000);
}
