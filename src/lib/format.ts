/** Display helpers. Money is £ for the account and $ for share prices. Always show + / − signs. */

const MINUS = "−";

export function gbp(n: number | null | undefined, opts: { sign?: boolean } = {}) {
  if (n == null || !Number.isFinite(n)) return "—";
  const s = `£${Math.abs(n).toFixed(2)}`;
  if (!opts.sign) return n < 0 ? MINUS + s : s;
  return n > 0 ? "+" + s : n < 0 ? MINUS + s : s;
}

export function usd(n: number | null | undefined, dp = 2) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n < 0 ? MINUS : ""}$${Math.abs(n).toFixed(dp)}`;
}

export function pct(n: number | null | undefined, opts: { sign?: boolean; dp?: number } = {}) {
  if (n == null || !Number.isFinite(n)) return "—";
  const s = `${Math.abs(n).toFixed(opts.dp ?? 1)}%`;
  if (!opts.sign) return n < 0 ? MINUS + s : s;
  return n > 0 ? "+" + s : n < 0 ? MINUS + s : s;
}

export function rMultiple(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n > 0 ? "+" : n < 0 ? MINUS : ""}${Math.abs(n).toFixed(1)}R`;
}

/** Up / down / flat class for colouring, always paired with a sign. */
export function tone(n: number | null | undefined) {
  if (n == null || n === 0) return "flat";
  return n > 0 ? "up" : "dn";
}

const dayFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short" });
const dayYearFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** "27 Nov" in UK time. Accepts an ISO timestamp or a YYYY-MM-DD day. */
export function shortDate(at: string | null | undefined, withYear = false) {
  if (!at) return "—";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(at) ? new Date(at + "T12:00:00Z") : new Date(at);
  return (withYear ? dayYearFmt : dayFmt).format(d);
}

/** Shares, trimming needless decimals: 3 or 3.12. */
export function shareCount(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/** Pill colour for a coach grade. */
export function gradeClass(grade: string | null | undefined) {
  if (!grade) return "neutral";
  if (grade.startsWith("A")) return "ok";
  if (grade.startsWith("B")) return "info";
  if (grade.startsWith("C")) return "warn";
  return "bad";
}
