import type { summarise } from "./summary";

type Summary = ReturnType<typeof summarise>;
type Tone = "ok" | "warn" | "bad" | "neutral";

/**
 * Everything Dad's page can show. This is the whitelist: the public page only
 * ever receives this object, so nothing else (trade ids, prices, emails, other
 * notes) can leak out.
 */
export type DadReport = {
  name: string;
  headline: string;
  tone: Tone;
  dayLine: string;
  updatedAt: string | null;
  months: { label: string; returnPct: number | null }[];
  targets: { name: string; value: string; tone: Tone }[];
  trades: { done: number; needed: number };
  latest: { ticker: string; pnlGbp: number; note: string } | null;
  coach: string | null;
};

const TONE: Record<string, Tone> = {
  done: "ok",
  passing: "ok",
  on_track: "ok",
  passed: "ok",
  watch: "warn",
  failing: "bad",
  not_started: "neutral",
};

const monthLabel = (day: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(new Date(day + "T12:00:00Z")).toUpperCase();

export function dadReport(args: {
  name: string | null;
  s: Summary;
  updatedAt: string | null;
  latest?: { ticker: string; pnl_gbp: number | null; notes: string | null } | null;
  coach?: string | null;
  showNotes: boolean;
  showAi: boolean;
}): DadReport {
  const { s } = args;
  const p = s.progress;
  const met = `${s.met} of 4 targets met`;
  const headline =
    s.overall === "passed"
      ? "Passed: all 4 targets met"
      : s.overall === "not_started"
        ? "Not started yet"
        : s.overall === "failing"
          ? `Behind: ${met}`
          : s.overall === "watch"
            ? `Close: ${met}`
            : `On track: ${met}`;

  const latestNote = args.latest?.notes?.trim();
  return {
    name: args.name?.trim() || "My",
    headline,
    tone: TONE[s.overall],
    dayLine: !p.started ? "Starts soon" : p.finished ? "Paper period finished" : `Day ${p.day} of ${p.totalDays}`,
    updatedAt: args.updatedAt,
    months: s.months.map((m) => ({ label: monthLabel(m.start), returnPct: m.state === "future" ? null : m.returnPct })),
    targets: s.targets.map((t) => ({ name: t.name, value: t.value, tone: TONE[t.status] })),
    trades: { done: s.trades.done, needed: s.trades.needed },
    latest:
      args.showNotes && args.latest && latestNote
        ? { ticker: args.latest.ticker, pnlGbp: args.latest.pnl_gbp ?? 0, note: latestNote.slice(0, 280) }
        : null,
    coach: args.showAi && args.coach?.trim() ? args.coach.trim().slice(0, 400) : null,
  };
}
