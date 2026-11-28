import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { CheckIcon, CrossIcon } from "@/components/icons";
import { requireOnboarded } from "@/lib/data";
import { gbp, pct, rMultiple, shareCount, shortDate, tone, usd } from "@/lib/format";
import { coachMessages, getTrade, latestReview, listScreenshots, listSetups } from "@/lib/journal";
import { CoachChat, CoachReview } from "@/components/CoachPanel";
import { aiConfigured } from "@/lib/ai/coach";
import { ScreenshotGallery } from "@/components/ScreenshotGallery";
import { daysBetween, londonDay } from "@/lib/maths";
import { CloseTradeForm, DeleteTradeButton, ReopenButton } from "./TradeActions";

export const metadata: Metadata = { title: "Trade" };

export default async function TradePage({ params, searchParams }: PageProps<"/trades/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, userId } = await requireOnboarded();
  const [trade, setups, shots, review, messages] = await Promise.all([
    getTrade(supabase, id),
    listSetups(supabase),
    listScreenshots(supabase, id),
    latestReview(supabase, id),
    coachMessages(supabase, id),
  ]);
  const aiOn = aiConfigured();
  if (!trade) notFound();

  const setup = setups.find((s) => s.id === trade.setup_id);
  const open = trade.status === "open";
  const today = londonDay(new Date());
  const held = daysBetween(londonDay(trade.opened_at), trade.closed_at ? londonDay(trade.closed_at) : today);
  const rulesDone = trade.trade_rules.filter((r) => r.followed).length;
  const dir = trade.direction === "long" ? "Long" : "Short";
  const pnlPct = trade.pnl_gbp != null && trade.risk_pct ? (trade.r_multiple ?? 0) * trade.risk_pct : null;

  return (
    <>
      <PageHeader title={`${trade.ticker} · ${dir}`} back="/trades" />
      <main className="page">
        {sp.saved === "shotfail" && (
          <div className="notice warn" role="status">
            Trade saved, but the screenshot didn&apos;t upload. Add it again below.
          </div>
        )}
        {sp.saved === "1" && (
          <div className="notice ok flex items-center gap-2" role="status">
            <CheckIcon size={16} /> Saved.
          </div>
        )}

        <div className="card" style={{ gap: 6 }}>
          <span className="lbl">{open ? "OPEN TRADE" : "RESULT"}</span>
          {open ? (
            <span className="big">Open</span>
          ) : (
            <span className={`big num ${tone(trade.pnl_gbp)}`}>{gbp(trade.pnl_gbp, { sign: true })}</span>
          )}
          <span className="muted num text-[13px]">
            {!open && <>{rMultiple(trade.r_multiple)} · {pct(pnlPct, { sign: true })} of account · </>}
            {shortDate(trade.opened_at)}
            {trade.closed_at ? ` → ${shortDate(trade.closed_at)}` : ""} · held {held} day{held === 1 ? "" : "s"}
          </span>
        </div>

        {open && <CloseTradeForm id={trade.id} today={today} openedDay={londonDay(trade.opened_at)} direction={trade.direction} target={trade.target} stop={trade.stop} />}

        <ScreenshotGallery tradeId={trade.id} userId={userId} shots={shots} closed={!open} />

        <div className="card">
          <div className="grid3">
            <KV label="Entry" value={usd(trade.entry)} />
            <KV label="Exit" value={usd(trade.exit)} />
            <KV label="Shares" value={shareCount(trade.shares)} />
            <KV label="Stop" value={usd(trade.stop)} />
            <KV label="Target" value={usd(trade.target)} />
            <KV label={`Risk (${trade.risk_pct}%)`} value={gbp(trade.risk_gbp)} />
          </div>
          <div className="chips">
            <span className="pill neutral">{setup?.name ?? "No setup"}</span>
            {trade.emotion && <span className="pill neutral">{trade.emotion}</span>}
            <span className={`pill ${rulesDone === trade.trade_rules.length && rulesDone > 0 ? "ok" : "warn"}`}>
              Rules {rulesDone}/{trade.trade_rules.length}
            </span>
            {trade.needs_details && <span className="pill warn">Needs details</span>}
          </div>
        </div>

        <CoachReview tradeId={trade.id} closed={!open} aiOn={aiOn} review={review} />

        {trade.trade_rules.length > 0 && (
          <div className="card" style={{ gap: 2 }}>
            <span className="h2" style={{ marginBottom: 6 }}>My rules</span>
            {trade.trade_rules.map((r) => (
              <div key={r.rule_text} className="check" style={{ cursor: "default" }}>
                <span className={`box ${r.followed ? "on" : "off"}`}>{r.followed ? <CheckIcon /> : <CrossIcon />}</span>
                <span>
                  {r.rule_text}
                  <span className="sr-only">{r.followed ? " (followed)" : " (broken)"}</span>
                </span>
              </div>
            ))}
          </div>
        )}

        {trade.notes && (
          <div className="card">
            <span className="h2">Notes</span>
            <p className="m-0 whitespace-pre-wrap" style={{ lineHeight: 1.5 }}>{trade.notes}</p>
          </div>
        )}

        <CoachChat
          tradeId={trade.id}
          aiOn={aiOn}
          messages={messages}
          placeholder="e.g. Was my stop in a good place?"
          suggestions={open ? ["Is my plan solid?", "Where should my stop go?"] : ["What should I learn from this?", "Did I exit too early?"]}
        />

        <div className="grid2">
          <Link href={`/trades/${trade.id}/edit`} className="btn sec">
            Edit
          </Link>
          <DeleteTradeButton id={trade.id} />
        </div>
        {!open && <ReopenButton id={trade.id} />}
      </main>
    </>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="kv">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
