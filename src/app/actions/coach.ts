"use server";

import { revalidatePath } from "next/cache";
import { AI_MODEL, CoachError, DAILY_LIMIT, askCoach, reviewTrade, spotPatterns, type ChatTurn } from "@/lib/ai/coach";
import { statsContext, tradeContext } from "@/lib/ai/context";
import { requireOnboarded } from "@/lib/data";
import { getTrade, listSetups, listTrades, toClosed } from "@/lib/journal";
import { groupStats, londonDay, weekdayOf } from "@/lib/maths";
import { gbp } from "@/lib/format";
import { summarise } from "@/lib/summary";

export type CoachResult<T> = { ok: true; data: T } | { ok: false; error: string };

type Ctx = Awaited<ReturnType<typeof requireOnboarded>>;

/** Keep AI spend predictable: a cap on coach replies per rolling 24 hours. */
async function underLimit({ supabase }: Ctx) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [a, b] = await Promise.all([
    supabase.from("ai_reviews").select("id", { count: "exact", head: true }).gte("created_at", since),
    supabase.from("ai_messages").select("id", { count: "exact", head: true }).eq("role", "assistant").gte("created_at", since),
  ]);
  return (a.count ?? 0) + (b.count ?? 0) < DAILY_LIMIT;
}

const LIMIT_MSG = `You've used today's ${DAILY_LIMIT} coach replies. They top up over the next 24 hours.`;

function fail(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof CoachError ? e.message : "Something went wrong with the coach." };
}

/** Grade a closed trade. Reuses the saved review unless `again` is set. */
export async function generateReview(tradeId: string, again = false): Promise<CoachResult<{ id: string }>> {
  const ctx = await requireOnboarded();
  const { supabase, profile } = ctx;
  const trade = await getTrade(supabase, tradeId);
  if (!trade) return { ok: false, error: "Trade not found." };
  if (trade.status !== "closed") return { ok: false, error: "The coach grades a trade once it's closed." };

  if (!again) {
    const { data: existing } = await supabase
      .from("ai_reviews")
      .select("id")
      .eq("trade_id", tradeId)
      .eq("kind", "review")
      .limit(1)
      .maybeSingle();
    if (existing) return { ok: true, data: { id: existing.id } };
  }
  if (!(await underLimit(ctx))) return { ok: false, error: LIMIT_MSG };

  try {
    const [setups, trades] = await Promise.all([listSetups(supabase), listTrades(supabase)]);
    const setup = setups.find((s) => s.id === trade.setup_id);
    const context = `${tradeContext(trade, setup)}\n\nHis overall stats:\n${statsContext(summarise(profile, trades))}`;
    const review = await reviewTrade(context);
    const { data, error } = await supabase
      .from("ai_reviews")
      .insert({ trade_id: tradeId, kind: "review", model: AI_MODEL, ...review })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: "Couldn't save the review." };
    revalidatePath(`/trades/${tradeId}`);
    revalidatePath("/trades");
    return { ok: true, data: { id: data.id } };
  } catch (e) {
    return fail(e);
  }
}

/** Chat with the coach about one trade, or about the month when tradeId is null. */
export async function sendCoachMessage(tradeId: string | null, question: string): Promise<CoachResult<{ answer: string }>> {
  const q = question.trim().slice(0, 1500);
  if (!q) return { ok: false, error: "Type a question first." };
  const ctx = await requireOnboarded();
  const { supabase, profile } = ctx;
  if (!(await underLimit(ctx))) return { ok: false, error: LIMIT_MSG };

  try {
    const [setups, trades] = await Promise.all([listSetups(supabase), listTrades(supabase)]);
    const summary = summarise(profile, trades);
    let context = `His overall stats:\n${statsContext(summary)}`;
    if (tradeId) {
      const trade = trades.find((t) => t.id === tradeId);
      if (!trade) return { ok: false, error: "Trade not found." };
      context = `This chat is about one trade:\n${tradeContext(trade, setups.find((s) => s.id === trade.setup_id))}\n\n${context}`;
    } else {
      const recent = trades
        .filter((t) => t.status === "closed")
        .slice(0, 15)
        .map((t) => tradeContext(t, setups.find((s) => s.id === t.setup_id)).split("\n").slice(0, 5).join(" "));
      context += `\n\nHis most recent closed trades:\n${recent.join("\n") || "none yet"}`;
    }

    let historyQuery = supabase.from("ai_messages").select("role, content").not("content", "like", "[[autofill]]%").order("created_at", { ascending: false }).limit(16);
    historyQuery = tradeId ? historyQuery.eq("trade_id", tradeId) : historyQuery.is("trade_id", null);
    const { data: hist } = await historyQuery;
    const history = ((hist ?? []) as ChatTurn[]).reverse();

    const answer = await askCoach(context, history, q);
    const now = Date.now();
    await supabase.from("ai_messages").insert([
      { trade_id: tradeId, role: "user", content: q, created_at: new Date(now).toISOString() },
      { trade_id: tradeId, role: "assistant", content: answer, created_at: new Date(now + 1).toISOString() },
    ]);
    revalidatePath(tradeId ? `/trades/${tradeId}` : "/coach");
    return { ok: true, data: { answer } };
  } catch (e) {
    return fail(e);
  }
}

/** "Patterns this month" (period = "YYYY-MM") or all time (period = "all"). Saved, so it's only re-run on request. */
export async function generatePatterns(period: string): Promise<CoachResult<{ id: string }>> {
  if (period !== "all" && !/^\d{4}-\d{2}$/.test(period)) return { ok: false, error: "Bad period." };
  const ctx = await requireOnboarded();
  const { supabase, profile } = ctx;
  if (!(await underLimit(ctx))) return { ok: false, error: LIMIT_MSG };
  const [setups, trades] = await Promise.all([listSetups(supabase), listTrades(supabase)]);
  const closed = trades.filter(
    (t) => t.status === "closed" && t.closed_at && (period === "all" || londonDay(t.closed_at).startsWith(period)),
  );
  if (closed.length < 3) return { ok: false, error: "Close at least 3 trades first so there's something to look at." };

  const name = new Map(setups.map((s) => [s.id, s.name]));
  const rows = closed.map((t) => ({ ...toClosed([t])[0], t }));
  const fmt = (label: string, g: ReturnType<typeof groupStats>) =>
    `${label}: ` + g.map((x) => `${x.key} ${x.trades} trades, ${x.wins} wins, ${gbp(x.pnl, { sign: true })}, avg ${x.avgR}R`).join("; ");
  const brokenCount = new Map<string, number>();
  for (const t of closed) for (const r of t.trade_rules) if (!r.followed) brokenCount.set(r.rule_text, (brokenCount.get(r.rule_text) ?? 0) + 1);
  const brokenRules = [...brokenCount].map(([k, v]) => `${k} ×${v}`).join("; ");
  const lines = [
    `Period: ${period === "all" ? "all time" : period}. ${closed.length} closed trades.`,
    fmt("By setup", groupStats(rows, (r) => (r.t.setup_id ? (name.get(r.t.setup_id) ?? "Unknown") : "No setup"))),
    fmt("By emotion", groupStats(rows, (r) => r.t.emotion ?? "Not recorded")),
    fmt("By weekday closed", groupStats(rows, (r) => weekdayOf(r.closedDay))),
    fmt("All rules followed?", groupStats(rows, (r) => (r.allRulesFollowed ? "All rules followed" : "Broke a rule"))),
    `Broken rules: ${brokenRules || "none"}`,
    "Trades:",
    ...rows.map(
      (r) =>
        `${r.closedDay} ${r.t.ticker} ${r.t.direction} ${r.t.setup_id ? name.get(r.t.setup_id) : "no setup"}, ${gbp(r.pnlGbp, { sign: true })} (${r.r}R), felt ${r.t.emotion ?? "?"}, rules ${r.t.trade_rules.filter((x) => x.followed).length}/${r.t.trade_rules.length}${r.t.exit != null && r.t.target != null && Math.abs(r.t.target - r.t.entry) > 0 ? `, exit ${Math.round(((r.t.exit - r.t.entry) / (r.t.target - r.t.entry)) * 100)}% of way to target` : ""}${r.t.notes ? `, note: "${r.t.notes.slice(0, 160)}"` : ""}`,
    ),
    `Starting balance ${gbp(profile.starting_balance)}.`,
  ];

  try {
    const res = await spotPatterns(lines.join("\n"));
    const { data, error } = await supabase
      .from("ai_patterns")
      .insert({ period, bullets: res.bullets, model: AI_MODEL })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: "Couldn't save the patterns." };
    revalidatePath("/stats");
    revalidatePath("/");
    return { ok: true, data: { id: data.id } };
  } catch (e) {
    return fail(e);
  }
}
