import Link from "next/link";
import { requireOnboarded } from "@/lib/data";
import { listTrades, recentTickers } from "@/lib/journal";
import { londonDay } from "@/lib/maths";
import { earningsBetween, earningsConfigured } from "@/lib/market/earnings";
import { eventsOn } from "@/lib/market/events";
import { nyTime, ukClock } from "@/lib/market/time";
import { dayTimeline, gamePlan, marketSession, tradeVerdict, type Tone } from "@/lib/market/today";
import { biasVerdict, isTradingDay, nextTradingDay, type Trend, type Zone } from "@/lib/playbook";

const VERDICT = {
  ok: { color: "var(--gain)", bg: "#0F2119", border: "#1D5A41" },
  warn: { color: "var(--warning)", bg: "#1E1A10", border: "#5A4718" },
  bad: { color: "var(--loss)", bg: "#22121A", border: "#5C2629" },
};
const SEG: Record<Tone, string> = { best: "#36D399", ok: "#7EA6FF", quiet: "#3A4458", bad: "#FF8080", info: "#5B6478" };
const SEG_WORD: Record<Tone, string> = { best: "Best", ok: "OK", quiet: "Quiet", bad: "Hands off", info: "Plan" };

const dayName = (d: string) =>
  new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));

export async function TodayTab({ selected }: { selected?: string }) {
  const today = londonDay(new Date());
  const days = [today];
  while (days.length < 5) days.push(nextTradingDay(days[days.length - 1]));
  const day = selected && days.includes(selected) ? selected : today;

  const { supabase } = await requireOnboarded();
  const [trades, { data: plan }] = await Promise.all([listTrades(supabase), supabase.from("daily_plans").select("spy_trend, range_zone, old_low").eq("date", day).maybeSingle()]);
  const tickers = [...new Set([...trades.filter((t) => t.status === "open").map((t) => t.ticker), ...recentTickers(trades)])];

  // "Within 2 days" = this trading day and the next two.
  const d1 = nextTradingDay(day);
  const d2 = nextTradingDay(d1);
  const lookAhead = nextTradingDay(nextTradingDay(d2));
  const earnings = await earningsBetween(day, lookAhead, tickers);
  const soon = earnings ? [...new Set(earnings.filter((e) => e.date <= d2).map((e) => e.symbol))] : null;

  const bias = plan ? biasVerdict(plan.spy_trend as Trend | null, plan.range_zone as Zone | null, plan.old_low != null ? Number(plan.old_low) : null) : null;
  const events = eventsOn(day);
  const session = marketSession(day);
  const timeline = dayTimeline(day, events);
  const verdict = tradeVerdict({ day, events, earningsSoon: soon, bias, ukTime: ukClock });
  const steps = gamePlan(verdict, bias, timeline, ukClock);
  const tone = VERDICT[verdict.tone];
  const usualOpen = session.open && ukClock(session.openAt) !== "14:30";

  const span = timeline.length ? timeline[timeline.length - 1].end.getTime() - timeline[0].start.getTime() : 1;

  return (
    <>
      <div className="chips" role="list" aria-label="Pick a day">
        {days.map((d) => (
          <Link key={d} role="listitem" href={d === today ? "/playbook?tab=today" : `/playbook?tab=today&d=${d}`} className={`chip ${d === day ? "on" : ""}`}>
            {d === today ? "Today" : dayName(d)}
          </Link>
        ))}
      </div>

      <div role="status" style={{ border: `1px solid ${tone.border}`, background: tone.bg, borderRadius: 16, padding: 16 }}>
        <div className="lbl">{day === today ? "TODAY" : dayName(day).toUpperCase()}</div>
        <div className="font-bold" style={{ color: tone.color, fontSize: 22 }}>
          {verdict.title}
        </div>
        <div className="muted mt-1" style={{ lineHeight: 1.5 }}>
          {verdict.why}
        </div>
      </div>

      <div className="card">
        <span className="font-bold">US market hours (UK time)</span>
        {session.open ? (
          <>
            <div className="flex gap-6">
              <div className="flex flex-col">
                <span className="lbl">Opens</span>
                <span className="num text-[20px] font-bold">{ukClock(session.openAt)}</span>
              </div>
              <div className="flex flex-col">
                <span className="lbl">Closes</span>
                <span className="num text-[20px] font-bold">{ukClock(session.closeAt)}</span>
              </div>
            </div>
            {session.earlyClose && <div className="notice warn">Half day for {session.earlyClose}. The market closes 3 hours early.</div>}
            {usualOpen && (
              <div className="notice warn">
                The US and UK change their clocks on different dates, so this week the market opens an hour earlier than usual for you.
              </div>
            )}
          </>
        ) : (
          <span className="muted">{session.reason}</span>
        )}
        {!isTradingDay(today) && day === today && <span className="muted text-[12px]">Next trading day: {dayName(nextTradingDay(today))}.</span>}
      </div>

      {timeline.length > 0 && (
        <div className="card">
          <span className="font-bold">The day, in UK time</span>
          <div className="flex h-3 overflow-hidden rounded-full" aria-hidden="true">
            {timeline.map((s) => (
              <div key={s.key} style={{ flex: (s.end.getTime() - s.start.getTime()) / span, background: SEG[s.tone] }} />
            ))}
          </div>
          <div className="flex flex-col">
            {timeline.map((s) => (
              <div key={s.key} className="flex gap-3 py-2" style={{ borderTop: "1px solid var(--border)" }}>
                <span className="num w-[92px] flex-none text-[13px]">
                  {ukClock(s.start)}–{ukClock(s.end)}
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-semibold">
                    {s.label}{" "}
                    <span className="text-[11px] font-semibold" style={{ color: s.tone === "quiet" || s.tone === "info" ? "var(--muted)" : SEG[s.tone] }}>
                      · {SEG_WORD[s.tone]}
                    </span>
                  </span>
                  <span className="muted text-[12px]" style={{ lineHeight: 1.45 }}>
                    {s.note}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <span className="font-bold">Big news</span>
        {events.length ? (
          events.map((e) => (
            <div key={e.title} className="flex flex-col gap-1 py-1">
              <div className="row">
                <span className="font-semibold">
                  <span className="num">{ukClock(nyTime(day, e.timeNy))}</span> {e.title}
                </span>
                <span className={`pill ${e.impact === "High" ? "bad" : e.impact === "Medium" ? "warn" : "neutral"}`}>{e.impact}</span>
              </div>
              <span className="muted text-[13px]" style={{ lineHeight: 1.5 }}>
                {e.explain}
                {e.estimated ? " This is the usual date; double-check it." : ""}
              </span>
            </div>
          ))
        ) : (
          <span className="muted">No Fed decision or jobs report on this day.</span>
        )}
        <span className="muted text-[12px]" style={{ lineHeight: 1.5 }}>
          Other news, like inflation (CPI) figures, isn&apos;t built in yet. Check a free economic calendar for &ldquo;high impact USD&rdquo; events before you trade.
        </span>
      </div>

      <div className="card">
        <span className="font-bold">Earnings on your shares</span>
        <span className="muted text-[12px]" style={{ lineHeight: 1.5 }}>
          A company&apos;s results can move its price 10% overnight. Your rule: no trades with earnings within 2 days.
        </span>
        {!earningsConfigured() ? (
          <div className="notice warn" style={{ lineHeight: 1.5 }}>
            Not switched on yet. Add your free Finnhub key in Vercel as <span className="num">MARKET_DATA_API_KEY</span> (see docs/SETUP.md).
          </div>
        ) : earnings === null ? (
          <div className="notice warn">Couldn&apos;t check earnings right now. Look them up before trading.</div>
        ) : earnings.length === 0 ? (
          <span>
            None this week for <span className="num">{tickers.join(", ")}</span>.
          </span>
        ) : (
          earnings.map((e) => (
            <div key={e.symbol + e.date} className="row">
              <span>
                <b className="num">{e.symbol}</b> {dayName(e.date)}
                {e.hour === "bmo" ? ", before the open" : e.hour === "amc" ? ", after the close" : ""}
              </span>
              {e.date <= d2 ? <span className="pill bad">Skip it</span> : <span className="pill neutral">Later</span>}
            </div>
          ))
        )}
      </div>

      <div className="card ai">
        <span className="font-bold" style={{ color: "var(--accent-soft)" }}>
          Coach game plan
        </span>
        <ol className="flex list-decimal flex-col gap-1.5 pl-5" style={{ lineHeight: 1.5 }}>
          {steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        {!bias && (
          <Link className="btn sec sm self-start" href="/playbook">
            Do Step 1: Bias
          </Link>
        )}
      </div>
    </>
  );
}

