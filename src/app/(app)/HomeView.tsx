import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { EquityCurve } from "@/components/EquityCurve";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { TradeRow } from "@/components/TradeRow";
import { PlusIcon, SparkIcon } from "@/components/icons";
import { gbp, pct, rMultiple, shortDate, tone } from "@/lib/format";
import type { TradeWithRules } from "@/lib/journal";
import type { Profile, Setup } from "@/lib/types";
import { summarise } from "@/lib/summary";

function greeting(now: Date) {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "numeric", hourCycle: "h23" }).format(now));
  return h < 12 ? "Morning" : h < 18 ? "Afternoon" : "Evening";
}

export function HomeView({
  profile,
  trades,
  setups,
  now,
  pattern = null,
}: {
  profile: Profile;
  trades: TradeWithRules[];
  setups: Setup[];
  now: Date;
  pattern?: { title: string; detail: string } | null;
}) {
  const s = summarise(profile, trades, now);
  const setupName = new Map(setups.map((x) => [x.id, x.name]));
  const p = s.progress;

  const headline = !p.started
    ? `Starts ${shortDate(profile.start_date, true)}`
    : p.finished
      ? "Paper period finished"
      : `Month ${p.month} of ${p.months} · Day ${p.day} of ${p.totalDays}`;

  return (
    <>
      <PageHeader title="OS Journal" logo />
      <main className="page wide">
        <div className="row hide-mobile flex-wrap">
          <div className="flex flex-col gap-1">
            <span className="lbl">
              {new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "long", day: "numeric", month: "long" }).format(now)}
            </span>
            <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>
              {greeting(now)}, {profile.display_name ?? "trader"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link className="btn sec" href="/log?mode=csv">Import CSV</Link>
            <Link className="btn sec" href="/log?mode=screenshot">Paste screenshot</Link>
            <Link className="btn pri" href="/log"><PlusIcon size={18} /> Log a trade</Link>
          </div>
        </div>

        {/* Road to a real account */}
        <section className="card" style={{ gap: 14 }} aria-labelledby="road">
          <div className="row items-start">
            <div className="flex flex-col gap-0.5">
              <span className="lbl" id="road">ROAD TO A REAL ACCOUNT</span>
              <span style={{ fontSize: 20, fontWeight: 700 }}>
                {headline}
                <span className="hide-mobile"> · {s.met} of 4 targets met</span>
              </span>
            </div>
            <StatusPill status={s.overall} />
          </div>
          <div className="bar" role="progressbar" aria-valuenow={Math.round(p.pct)} aria-valuemin={0} aria-valuemax={100} aria-label="How far through the 3 months you are">
            <div style={{ width: `${Math.max(p.pct, 1.5)}%` }} />
          </div>
          <div className="muted text-xs" style={{ lineHeight: 1.5 }}>
            Hit all 4 targets by <b style={{ color: "var(--text)" }}>{shortDate(p.endDate, true)}</b> and Dad opens your real account.
          </div>
          <div className="grid gap-x-6 lg:grid-cols-2">
            {s.targets.map((t) => (
              <div key={t.key} className="row items-start" style={{ padding: "10px 0", borderTop: "1px solid #1E2635" }}>
                <div className="flex min-w-0 flex-col gap-[3px]">
                  <span className="font-semibold">{t.name}</span>
                  <span className="muted text-xs" style={{ lineHeight: 1.4 }}>{t.hint}</span>
                </div>
                <div className="flex flex-none flex-col items-end gap-[5px]">
                  <span className="num text-[13px]">{t.value}</span>
                  <StatusPill status={t.status} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="row">
              <span className="lbl">Trades logged</span>
              <span className="num text-[13px]">{s.trades.done} / {s.trades.needed}</span>
            </div>
            <div className="bar"><div style={{ width: `${Math.max(s.trades.pct, 1.5)}%`, background: "var(--gain)" }} /></div>
          </div>
        </section>

        <div className="grid gap-3.5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-3.5">
            <div className="grid2">
              <div className="card" style={{ gap: 4, padding: 14 }}>
                <span className="lbl">Paper account</span>
                <span className="num" style={{ fontSize: 20, fontWeight: 600 }}>{gbp(s.balance)}</span>
                <span className={`num text-xs ${tone(s.change)}`}>
                  {gbp(s.change, { sign: true })} · {pct(s.changePct, { sign: true })}
                </span>
              </div>
              <div className="card" style={{ gap: 4, padding: 14 }}>
                <span className="lbl">Risk per trade ({profile.risk_pct}%)</span>
                <span className="num" style={{ fontSize: 20, fontWeight: 600 }}>{gbp(s.riskPerTrade)}</span>
                <span className="muted text-xs">max you can lose</span>
              </div>
            </div>

            <div className="card hide-mobile">
              <div className="row">
                <span className="h2">Balance</span>
                <span className="lbl">since {shortDate(profile.start_date)}</span>
              </div>
              <EquityCurve start={profile.starting_balance} points={s.curve} />
              <div className="grid grid-cols-4 gap-2.5">
                <Mini label="Win rate" value={pct(s.stats.winRate, { dp: 0 })} />
                <Mini label="Profit factor" value={s.stats.profitFactor?.toFixed(2) ?? "—"} />
                <Mini label="Avg trade" value={rMultiple(s.stats.avgR)} cls={tone(s.stats.avgR)} />
                <Mini label="Rules kept" value={pct(s.stats.rulesFollowedPct, { dp: 0 })} />
              </div>
            </div>

            <Link href="/log" className="btn pri hide-desktop">
              <PlusIcon size={20} /> Log a trade
            </Link>
          </div>

          <div className="card ai">
            <div className="flex items-center gap-2">
              <SparkIcon size={18} style={{ color: "var(--accent-soft)" }} />
              <span className="font-bold" style={{ color: "var(--accent-soft)" }}>{pattern ? "Coach spotted a pattern" : "Coach"}</span>
            </div>
            <div style={{ lineHeight: 1.5 }}>
              {pattern ? (
                <>
                  <b>{pattern.title}.</b> {pattern.detail}
                </>
              ) : s.trades.done < 3 ? (
                `Close ${3 - s.trades.done} more trade${3 - s.trades.done === 1 ? "" : "s"} and your coach can start spotting patterns.`
              ) : (
                <>
                  Ready to look for patterns. <Link href="/stats">Open Stats</Link> and tap “Spot my patterns”.
                </>
              )}
            </div>
            <Link className="btn sec sm self-start" href="/playbook">Open my playbook</Link>
          </div>
        </div>

        <div className="grid gap-3.5 lg:grid-cols-2">
          <section className="flex flex-col gap-2.5">
            <span className="h2">Open trade{s.open.length === 1 ? "" : "s"}</span>
            {s.open.length === 0 ? (
              <span className="muted text-[13px]">Nothing open right now.</span>
            ) : (
              s.open.map((t) => <TradeRow key={t.id} trade={t} setupName={t.setup_id ? setupName.get(t.setup_id) : null} />)
            )}
          </section>
          <section className="flex flex-col gap-2.5">
            <div className="row">
              <span className="h2">Recent trades</span>
              <Link className="btn sec sm" href="/trades">See all</Link>
            </div>
            {s.recentClosed.length === 0 ? (
              trades.length === 0 ? (
                <EmptyState title="Log your first trade">
                  Tap the + button. It takes about 20 seconds.
                </EmptyState>
              ) : (
                <span className="muted text-[13px]">No closed trades yet.</span>
              )
            ) : (
              s.recentClosed.map((t) => <TradeRow key={t.id} trade={t} setupName={t.setup_id ? setupName.get(t.setup_id) : null} />)
            )}
          </section>
        </div>
      </main>
    </>
  );
}

function Mini({ label, value, cls = "" }: { label: string; value: string; cls?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="lbl">{label}</span>
      <b className={`num ${cls}`}>{value}</b>
    </div>
  );
}
