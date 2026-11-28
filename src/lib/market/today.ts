import { US_EARLY_CLOSES, US_MARKET_HOLIDAYS } from "./holidays";
import type { MarketEvent } from "./events";
import { addMinutes, nyTime } from "./time";
import { isWeekend } from "../playbook";
import type { Verdict } from "../playbook";

export type Session =
  | { open: false; reason: string }
  | { open: true; openAt: Date; closeAt: Date; earlyClose: string | null };

/** US market hours for a day, as real instants (show them in UK time). */
export function marketSession(day: string): Session {
  if (isWeekend(day)) return { open: false, reason: "Weekend. The US market is closed." };
  const holiday = US_MARKET_HOLIDAYS[day];
  if (holiday) return { open: false, reason: `US market holiday: ${holiday}.` };
  const early = US_EARLY_CLOSES[day] ?? null;
  return { open: true, openAt: nyTime(day, "09:30"), closeAt: nyTime(day, early ? "13:00" : "16:00"), earlyClose: early };
}

export type Tone = "best" | "ok" | "quiet" | "bad" | "info";
export type Segment = { key: string; label: string; start: Date; end: Date; tone: Tone; note: string };

/** The trading day split into windows, with news events shifting or reddening them. */
export function dayTimeline(day: string, events: MarketEvent[]): Segment[] {
  const s = marketSession(day);
  if (!s.open) return [];
  const ny = (t: string) => nyTime(day, t);
  let segs: Segment[] = s.earlyClose
    ? [
        { key: "rush", label: "Opening rush", start: ny("09:30"), end: ny("10:00"), tone: "bad", note: "Hands off. Prices jump around while orders flood in." },
        { key: "morning", label: "Morning", start: ny("10:00"), end: ny("12:00"), tone: "best", note: "Half day: quieter than usual. Only clean setups." },
        { key: "last", label: "Last hour (early close)", start: ny("12:00"), end: ny("13:00"), tone: "ok", note: "Market shuts early today." },
      ]
    : [
        { key: "rush", label: "Opening rush", start: ny("09:30"), end: ny("10:00"), tone: "bad", note: "Hands off. Prices jump around while orders flood in." },
        { key: "morning", label: "NY morning", start: ny("10:00"), end: ny("11:30"), tone: "best", note: "Best window. The day's direction usually shows here." },
        { key: "lunch", label: "Lunch lull", start: ny("11:30"), end: ny("13:30"), tone: "quiet", note: "Quiet. Moves are small and fake-outs are common." },
        { key: "afternoon", label: "Afternoon", start: ny("13:30"), end: ny("15:00"), tone: "ok", note: "OK. Volume comes back." },
        { key: "last", label: "Last hour", start: ny("15:00"), end: ny("16:00"), tone: "best", note: "Best for swing trades: you see how the day's candle closes." },
      ];
  segs.push({ key: "after", label: "After close", start: s.closeAt, end: addMinutes(s.closeAt, 30), tone: "info", note: "Journal your trades and plan tomorrow." });

  for (const e of events) {
    const at = nyTime(day, e.timeNy);
    if (e.impact !== "High") continue;
    if (at <= s.openAt) {
      // Pre-market news: the opening rush gets even wilder.
      segs = segs.map((g) => (g.key === "rush" ? { ...g, note: `${e.title} came out before the open. Expect big swings. Hands off.` } : g));
      continue;
    }
    // During the day: hands off from 15 minutes before to 30 minutes after.
    const from = addMinutes(at, -15);
    const to = addMinutes(at, 30);
    const out: Segment[] = [];
    for (const g of segs) {
      if (g.end <= from || g.start >= to) {
        out.push(g);
        continue;
      }
      if (g.start < from) out.push({ ...g, end: from });
      out.push({ key: `news-${g.key}`, label: e.title, start: from > g.start ? from : g.start, end: to < g.end ? to : g.end, tone: "bad", note: "Hands off around the news." });
      if (g.end > to) out.push({ ...g, key: `${g.key}-after`, start: to });
    }
    segs = out;
  }
  return segs;
}

export type DayVerdict = { key: "trade" | "careful" | "wait" | "sit_out"; title: string; tone: "ok" | "warn" | "bad"; why: string };

export function tradeVerdict(args: {
  day: string;
  events: MarketEvent[];
  /** Tickers with earnings within 2 trading days. null = not known (no data key). */
  earningsSoon: string[] | null;
  bias: Verdict | null;
  ukTime: (d: Date) => string;
}): DayVerdict {
  const s = marketSession(args.day);
  if (!s.open) return { key: "sit_out", title: "Sit out", tone: "bad", why: s.reason };
  if (args.bias?.key === "sit_out") return { key: "sit_out", title: "Sit out", tone: "bad", why: `Your bias says sit out. ${args.bias.why}` };

  const high = args.events.filter((e) => e.impact === "High");
  const pre = high.find((e) => nyTime(args.day, e.timeNy) <= s.openAt);
  const during = high.find((e) => nyTime(args.day, e.timeNy) > s.openAt);
  const notes: string[] = [];
  if (args.earningsSoon?.length) notes.push(`Skip ${args.earningsSoon.join(", ")}: earnings within 2 days.`);
  if (s.earlyClose) notes.push(`Half day (${s.earlyClose}): the market shuts at ${args.ukTime(s.closeAt)} UK.`);
  if (args.bias && args.bias.key !== "buys") notes.push(`Your bias: ${args.bias.title.toLowerCase()}.`);

  if (during) {
    const at = nyTime(args.day, during.timeNy);
    return {
      key: "careful",
      title: "Trade carefully",
      tone: "warn",
      why: [`${during.title} at ${args.ukTime(at)} UK. No new trades from ${args.ukTime(addMinutes(at, -15))} until ${args.ukTime(addMinutes(at, 30))}.`, ...notes].join(" "),
    };
  }
  if (pre) {
    const from = addMinutes(s.openAt, 30);
    return {
      key: "wait",
      title: `Wait until ${args.ukTime(from)}`,
      tone: "warn",
      why: [`${pre.title} comes out before the open, so the first half hour will be wild.`, ...notes].join(" "),
    };
  }
  if (notes.length) return { key: "careful", title: "Trade carefully", tone: "warn", why: notes.join(" ") };
  return { key: "trade", title: "Trade day", tone: "ok", why: "No big news and no earnings on your shares. Follow your plan and only take A+ setups." };
}

/** A short plain-English plan for the day. Process only, never what to buy. */
export function gamePlan(v: DayVerdict, bias: Verdict | null, timeline: Segment[], ukTime: (d: Date) => string): string[] {
  if (v.key === "sit_out") return ["No trades today. Use the time to review last week's trades and mark key levels on SPY."];
  const plan: string[] = [];
  if (!bias) plan.push("Do Step 1 first: check the SPY daily chart and save your bias.");
  const best = timeline.filter((s) => s.tone === "best");
  if (best.length) plan.push(`Look at charts in the best windows: ${best.map((s) => `${ukTime(s.start)}–${ukTime(s.end)}`).join(" and ")} UK.`);
  plan.push("Only enter if every box on your setup checklist is ticked. Set your stop order straight away.");
  plan.push("Log the trade straight after. It takes 20 seconds.");
  return plan;
}
