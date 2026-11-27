import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { EquityCurve } from "@/components/EquityCurve";
import { PageHeader } from "@/components/PageHeader";
import { PatternsCard } from "@/components/PatternsCard";
import { aiConfigured } from "@/lib/ai/coach";
import { requireOnboarded } from "@/lib/data";
import { gbp, pct, rMultiple, tone } from "@/lib/format";
import { listSetups, listTrades, toClosed } from "@/lib/journal";
import { US_MARKET_HOLIDAYS, isMarketHoliday } from "@/lib/market/holidays";
import {
  computeStats,
  equityCurve,
  groupStats,
  londonDay,
  monthCalendar,
  shiftMonth,
  weekdayOf,
  type GroupStat,
} from "@/lib/maths";

export const metadata: Metadata = { title: "Stats" };

const monthName = (m: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(m + "-01T12:00:00Z"));

export default async function StatsPage({ searchParams }: PageProps<"/stats">) {
  const sp = await searchParams;
  const range = sp.range === "all" ? "all" : "month";
  const thisMonth = londonDay(new Date()).slice(0, 7);
  const month = typeof sp.m === "string" && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m : thisMonth;

  const { supabase, profile } = await requireOnboarded();
  const [trades, setups, patterns] = await Promise.all([
    listTrades(supabase),
    listSetups(supabase),
    supabase
      .from("ai_patterns")
      .select("bullets, created_at")
      .eq("period", range === "all" ? "all" : month)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const closedTrades = trades.filter((t) => t.status === "closed" && t.closed_at);
  const rows = closedTrades.map((t) => ({ ...toClosed([t])[0], t }));
  const inRange = range === "all" ? rows : rows.filter((r) => r.closedDay.startsWith(month));
  const stats = computeStats(inRange);

  const before = rows.filter((r) => r.closedDay < month + "-01").reduce((s, r) => s + r.pnlGbp, 0);
  const startBal = range === "all" ? profile.starting_balance : profile.starting_balance + before;
  const curve = equityCurve(startBal, inRange);
  const calendar = monthCalendar(month, rows, isMarketHoliday);
  const setupName = new Map(setups.map((s) => [s.id, s.name]));
  const bySetup = groupStats(inRange, (r) => (r.t.setup_id ? (setupName.get(r.t.setup_id) ?? "Unknown") : "No setup"));
  const byEmotion = groupStats(inRange, (r) => r.t.emotion ?? "Not recorded");
  const byDay = groupStats(inRange, (r) => weekdayOf(r.closedDay));

  const q = (o: Record<string, string>) => {
    const p = new URLSearchParams({ range, m: month, ...o });
    if (p.get("range") === "month") p.delete("range");
    if (p.get("m") === thisMonth) p.delete("m");
    const s = p.toString();
    return s ? `/stats?${s}` : "/stats";
  };

  return (
    <>
      <PageHeader title="Stats" />
      <main className="page wide">
        <div className="flex flex-wrap items-center gap-3">
          <nav className="seg" aria-label="Time range" style={{ minWidth: 240 }}>
            <Link href={q({ range: "month" })} className={range === "month" ? "on" : ""}>
              Month
            </Link>
            <Link href={q({ range: "all" })} className={range === "all" ? "on" : ""}>
              All time
            </Link>
          </nav>
          <div className="flex items-center gap-1">
            <Link className="icon-btn" href={q({ m: shiftMonth(month, -1) })} aria-label="Previous month">
              ‹
            </Link>
            <span className="min-w-[130px] text-center font-semibold">{monthName(month)}</span>
            <Link className="icon-btn" href={q({ m: shiftMonth(month, 1) })} aria-label="Next month">
              ›
            </Link>
          </div>
        </div>

        {closedTrades.length === 0 ? (
          <EmptyState title="No stats yet">Close your first trade and your stats start here.</EmptyState>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
              <Tile label="Net P&L" value={gbp(stats.netPnl, { sign: true })} cls={tone(stats.netPnl)} hint={`${stats.trades} closed trade${stats.trades === 1 ? "" : "s"}`} />
              <Tile label="Win rate" value={pct(stats.winRate, { dp: 0 })} hint={`${stats.wins} won, ${stats.losses} lost`} />
              <Tile
                label="Avg win vs avg loss"
                value={`${gbp(stats.avgWin)} / ${gbp(stats.avgLoss)}`}
                cls={stats.avgWin != null && stats.avgLoss != null ? (stats.avgWin > stats.avgLoss ? "up" : "dn") : ""}
                hint="Dad's target: wins bigger than losses"
              />
              <Tile label="Profit factor" value={stats.profitFactor?.toFixed(2) ?? "—"} hint="Money won ÷ money lost. Above 1 = making money" />
              <Tile label="Average R" value={rMultiple(stats.avgR)} cls={tone(stats.avgR)} hint="Average result in “risks”. +0.5R = half your risk per trade" />
            </div>

            <div className="grid gap-3.5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              <div className="card">
                <div className="row">
                  <span className="h2">Balance</span>
                  <span className="lbl">{range === "all" ? "all time" : monthName(month)}</span>
                </div>
                <EquityCurve start={startBal} points={curve} height={170} />
                <div className="row text-xs">
                  <span className="muted num">Start {gbp(startBal)}</span>
                  <span className="num">Now {gbp(curve.length ? curve[curve.length - 1].balance : startBal)}</span>
                </div>
              </div>

              <div className="card">
                <div className="row">
                  <span className="h2">{monthName(month)}</span>
                  <span className="lbl">P&amp;L by day</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5" role="table" aria-label={`Profit and loss by day, ${monthName(month)}`}>
                  {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => (
                    <span key={d} className="lbl text-center" role="columnheader">
                      {d}
                    </span>
                  ))}
                  {calendar.flat().map((c) => (
                    <div
                      key={c.day}
                      role="cell"
                      title={c.holiday ? `US market closed: ${US_MARKET_HOLIDAYS[c.day]}` : undefined}
                      className="flex h-[52px] flex-col justify-between rounded-[10px] border p-1.5"
                      style={{
                        opacity: !c.inMonth ? 0.25 : c.holiday ? 0.45 : 1,
                        background: c.pnl == null ? "#0F131B" : c.pnl > 0 ? "#0F2A20" : c.pnl < 0 ? "#2C1416" : "#0F131B",
                        borderColor:
                          c.day === londonDay(new Date()) ? "var(--accent)" : c.pnl == null ? "#1E2635" : c.pnl > 0 ? "#1D5A41" : c.pnl < 0 ? "#5C2629" : "#1E2635",
                      }}
                    >
                      <span className="text-[10px] text-[var(--muted)]">{c.holiday ? `${c.date} · closed` : c.date}</span>
                      {c.pnl != null && c.inMonth && (
                        <b className={`num text-[11px] ${tone(c.pnl)}`}>{gbp(c.pnl, { sign: true }).replace(".00", "")}</b>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-3.5 lg:grid-cols-3">
              <Bars title="By setup" rows={bySetup} />
              <Bars title="By how you felt" rows={byEmotion} />
              <Bars title="By day closed" rows={byDay} />
            </div>

            <PatternsCard
              period={range === "all" ? "all" : month}
              label={range === "all" ? "Patterns, all time" : `Patterns in ${monthName(month)}`}
              aiOn={aiConfigured()}
              enough={inRange.length >= 3}
              bullets={(patterns.data?.bullets as { title: string; detail: string }[] | undefined) ?? null}
              updated={patterns.data?.created_at ?? null}
            />
          </>
        )}
      </main>
    </>
  );
}

function Tile({ label, value, hint, cls = "" }: { label: string; value: string; hint: string; cls?: string }) {
  return (
    <div className="stat">
      <span className="lbl">{label}</span>
      <b className={cls} style={{ fontSize: 17 }}>
        {value}
      </b>
      <span className="muted text-[11px]" style={{ lineHeight: 1.35 }}>
        {hint}
      </span>
    </div>
  );
}

function Bars({ title, rows }: { title: string; rows: GroupStat[] }) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.pnl)));
  return (
    <div className="card">
      <span className="h2">{title}</span>
      {rows.length === 0 && <span className="muted text-[13px]">No trades in this range.</span>}
      {rows.map((r) => (
        <div key={r.key} className="flex flex-col gap-1">
          <div className="row text-[13px]">
            <span className="font-semibold">{r.key}</span>
            <span className={`num ${tone(r.pnl)}`}>{gbp(r.pnl, { sign: true })}</span>
          </div>
          <div className="bar" style={{ height: 6 }}>
            <div style={{ width: `${(Math.abs(r.pnl) / max) * 100}%`, background: r.pnl >= 0 ? "var(--gain)" : "var(--loss)" }} />
          </div>
          <span className="muted num text-[11px]">
            {r.trades} trade{r.trades === 1 ? "" : "s"} · {r.wins} won · avg {rMultiple(r.avgR)}
          </span>
        </div>
      ))}
    </div>
  );
}
