import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { SetupExampleChart, TrendDiagram } from "@/components/SetupExampleChart";
import { requireOnboarded } from "@/lib/data";
import { gbp, pct, rMultiple, tone } from "@/lib/format";
import { listRules, listSetups, listTrades, toClosed } from "@/lib/journal";
import { groupStats, londonDay } from "@/lib/maths";
import { planDay, type Trend, type Zone } from "@/lib/playbook";
import type { Setup } from "@/lib/types";
import { BiasForm } from "./BiasForm";
import { RulesEditor } from "./RulesEditor";
import { EditableSetup, SetupEditor } from "./SetupEditor";

export const metadata: Metadata = { title: "Playbook" };

const TABS = [
  { key: "bias", label: "1 · Bias" },
  { key: "setup", label: "2 · Setup" },
  { key: "today", label: "Trade today?" },
] as const;

const dayName = (d: string) =>
  new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));

export default async function PlaybookPage({ searchParams }: PageProps<"/playbook">) {
  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === sp.tab) ? (sp.tab as string) : "bias";

  return (
    <>
      <PageHeader title="Playbook" />
      <main className="page">
        <nav className="seg" aria-label="Playbook steps">
          {TABS.map((t) => (
            <Link key={t.key} href={t.key === "bias" ? "/playbook" : `/playbook?tab=${t.key}`} className={tab === t.key ? "on" : ""} aria-current={tab === t.key ? "page" : undefined}>
              {t.label}
            </Link>
          ))}
        </nav>
        {tab === "bias" && <BiasTab />}
        {tab === "setup" && <SetupTab selected={typeof sp.s === "string" ? sp.s : undefined} />}
        {tab === "today" && <TodayTab />}
      </main>
    </>
  );
}

async function BiasTab() {
  const now = new Date();
  const today = londonDay(now);
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "numeric", hourCycle: "h23" }).format(now));
  const day = planDay(today, hour);
  const dayLabel = day === today ? `today (${dayName(day)})` : dayName(day);

  const { supabase } = await requireOnboarded();
  const { data: plan } = await supabase.from("daily_plans").select("*").eq("date", day).maybeSingle();

  return (
    <>
      <div className="card">
        <span className="font-bold">Step 1: which way is the market leaning?</span>
        <span className="muted" style={{ lineHeight: 1.5 }}>
          Open the SPY daily chart. This is your &ldquo;bias&rdquo;: the direction you&apos;ll trade in today. Two questions, then one answer.
        </span>
        <TrendDiagram />
        <span className="muted text-[12px]" style={{ lineHeight: 1.5 }}>
          HH = higher high, HL = higher low, LH = lower high, LL = lower low.
        </span>
      </div>
      <BiasForm
        key={day}
        day={day}
        dayLabel={dayLabel}
        savedAt={plan?.updated_at ?? null}
        initial={
          plan
            ? {
                trend: plan.spy_trend as Trend | null,
                zone: plan.range_zone as Zone | null,
                oldHigh: plan.old_high != null ? Number(plan.old_high) : null,
                oldLow: plan.old_low != null ? Number(plan.old_low) : null,
                notes: plan.notes ?? "",
              }
            : null
        }
      />
      <Link className="btn sec" href="/playbook?tab=setup">
        Next: Step 2, the setup →
      </Link>
    </>
  );
}

async function SetupTab({ selected }: { selected?: string }) {
  const { supabase, userId } = await requireOnboarded();
  const [setups, rules, trades] = await Promise.all([listSetups(supabase), listRules(supabase), listTrades(supabase)]);
  const adding = selected === "new" || setups.length === 0;
  const setup = adding ? null : (setups.find((s) => s.id === selected) ?? setups[0]);

  return (
    <>
      <div className="chips" role="list" aria-label="Your setups">
        {setups.map((s) => (
          <Link key={s.id} role="listitem" href={`/playbook?tab=setup&s=${s.id}`} className={`chip ${setup?.id === s.id ? "on" : ""}`}>
            {s.name}
          </Link>
        ))}
        <Link role="listitem" href="/playbook?tab=setup&s=new" className={`chip ${adding ? "on" : ""}`}>
          + Add my own setup
        </Link>
      </div>

      {adding || !setup ? (
        <SetupEditor key="new" userId={userId} setup={null} />
      ) : (
        <SetupCard
          key={setup.id}
          userId={userId}
          setup={setup}
          imageUrl={setup.example_image_path ? await signedUrl(supabase, setup.example_image_path) : null}
          closed={toClosed(trades.filter((t) => t.setup_id === setup.id && t.status === "closed" && t.closed_at))}
        />
      )}

      <RulesEditor rules={rules} />
    </>
  );
}

type Supa = Awaited<ReturnType<typeof requireOnboarded>>["supabase"];

async function signedUrl(supabase: Supa, path: string) {
  const { data } = await supabase.storage.from("screenshots").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

function SetupCard({
  userId,
  setup,
  imageUrl,
  closed,
}: {
  userId: string;
  setup: Setup;
  imageUrl: string | null;
  closed: ReturnType<typeof toClosed>;
}) {
  const res = groupStats(closed, () => "all")[0];
  const isStarter = /sweep/i.test(setup.name) && /fvg/i.test(setup.name);

  return (
    <EditableSetup userId={userId} setup={setup} hasImage={!!setup.example_image_path}>
      <div className="card">
        <div className="flex flex-col gap-1">
          <span className="text-[18px] font-bold">{setup.name}</span>
          {setup.one_liner && <span className="muted" style={{ lineHeight: 1.5 }}>{setup.one_liner}</span>}
        </div>

        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed URL from private storage
          <img src={imageUrl} alt={`Your example of ${setup.name}`} className="w-full rounded-xl border border-[var(--border)]" />
        ) : isStarter ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-2">
            <SetupExampleChart />
            <div className="muted px-1 pt-1 text-[11px]" style={{ lineHeight: 1.5 }}>
              Sweep = price dips under an old low to grab stop orders, then snaps back. BOS (break of structure) = price closes above the last high. FVG (fair
              value gap) = the gap the big move leaves behind.
            </div>
          </div>
        ) : (
          <div className="notice warn">No example picture yet. Press &ldquo;Edit this setup&rdquo; to add a screenshot of a perfect one.</div>
        )}

        {setup.checklist.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="lbl">What I look for</span>
            <ol className="flex list-decimal flex-col gap-1.5 pl-5" style={{ lineHeight: 1.5 }}>
              {setup.checklist.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ol>
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {(
            [
              ["Entry", setup.entry_rule, "var(--accent-soft)"],
              ["Stop", setup.stop_rule, "var(--loss)"],
              ["Target", setup.target_rule, "var(--gain)"],
            ] as const
          ).map(([label, text, color]) =>
            text ? (
              <div key={label} className="flex gap-3" style={{ lineHeight: 1.5 }}>
                <span className="w-[56px] flex-none font-semibold" style={{ color }}>
                  {label}
                </span>
                <span>{text}</span>
              </div>
            ) : null,
          )}
        </div>

        {setup.avoid && (
          <div className="notice bad">
            <b>Skip it if:</b> {setup.avoid}
          </div>
        )}
      </div>

      <div className="card">
        <span className="font-bold">My results with this setup</span>
        {res ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Stat label="Trades" value={String(res.trades)} />
            <Stat label="Win rate" value={pct(res.winRate, { dp: 0 })} hint={`${res.wins} won`} />
            <Stat label="Average R" value={rMultiple(res.avgR)} cls={tone(res.avgR)} />
            <Stat label="Total" value={gbp(res.pnl, { sign: true })} cls={tone(res.pnl)} />
          </div>
        ) : (
          <span className="muted">No closed trades with this setup yet.</span>
        )}
        <div className="notice" style={{ lineHeight: 1.5 }}>
          <b>Coach note:</b> {coachNote(res)}
        </div>
        <Link className="btn pri" href={`/log?setup=${setup.id}`}>
          Log a trade with this setup
        </Link>
      </div>
    </EditableSetup>
  );
}

function coachNote(res: ReturnType<typeof groupStats>[number] | undefined) {
  if (!res) return "Log a few trades with this setup and your results show up here. Judge it after 10 or more, not after one.";
  if (res.trades < 10) return `Only ${res.trades} closed so far. Too early to judge. Keep following the checklist exactly so the results mean something.`;
  if (res.avgR > 0) return "This setup is paying you on average. Keep taking only the clean ones and don't loosen the checklist.";
  return "This setup is losing on average. Look back at the losers: did they really tick every box, or were some forced?";
}

function Stat({ label, value, hint, cls = "" }: { label: string; value: string; hint?: string; cls?: string }) {
  return (
    <div className="stat">
      <span className="lbl">{label}</span>
      <span className={`num text-[18px] font-bold ${cls}`}>{value}</span>
      {hint && <span className="muted text-[11px]">{hint}</span>}
    </div>
  );
}

function TodayTab() {
  return (
    <div className="card">
      <span className="font-bold">Trade today?</span>
      <span className="muted" style={{ lineHeight: 1.5 }}>
        Coming next: a daily answer on whether to trade, US market hours in UK time, the best windows of the day, big news events and earnings dates for your
        shares. Until then, check for earnings and big news (like the jobs report or interest rate decisions) before you enter.
      </span>
    </div>
  );
}
