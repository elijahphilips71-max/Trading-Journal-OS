"use server";

import { revalidatePath } from "next/cache";
import { requireOnboarded } from "@/lib/data";
import { gbpUsdRate } from "@/lib/fx";
import { accountBalance, getTrade, listTrades } from "@/lib/journal";
import { closeTrade as calcClose, londonDay, positionSize, round } from "@/lib/maths";
import type { Direction } from "@/lib/types";

export type RuleTick = { rule_id: string | null; rule_text: string; followed: boolean };

export type TradeInput = {
  ticker: string;
  direction: Direction;
  entry: number;
  stop: number;
  target: number | null;
  riskPct: number;
  setupId: string | null;
  emotion: string | null;
  notes: string;
  rules: RuleTick[];
  /** YYYY-MM-DD. Leave empty for "now". */
  openedDay?: string | null;
  source?: "quick" | "screenshot" | "csv";
  /** Edit only: keep the size he actually traded. */
  shares?: number | null;
  /** Edit only, for closed trades. */
  exit?: number | null;
  closedDay?: string | null;
};

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function cleanTicker(s: string) {
  return s.trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, "").slice(0, 12);
}

/** A moment for a chosen day: now if it's today, otherwise midday UK-ish on that day. */
function atFor(day: string | null | undefined) {
  if (!day || !DAY.test(day) || day === londonDay(new Date())) return new Date().toISOString();
  return `${day}T12:00:00.000Z`;
}

function baseChecks(input: TradeInput): string | null {
  if (!cleanTicker(input.ticker)) return "Add a ticker, like SPY or AAPL.";
  if (input.direction !== "long" && input.direction !== "short") return "Pick Long or Short.";
  if (input.notes && input.notes.length > 4000) return "Notes are too long.";
  return null;
}

async function saveRules(
  supabase: Awaited<ReturnType<typeof requireOnboarded>>["supabase"],
  tradeId: string,
  rules: RuleTick[],
) {
  await supabase.from("trade_rules").delete().eq("trade_id", tradeId);
  const seen = new Set<string>();
  const rows = rules
    .filter((r) => r.rule_text && !seen.has(r.rule_text) && seen.add(r.rule_text))
    .map((r, i) => ({ trade_id: tradeId, rule_id: r.rule_id, rule_text: r.rule_text, followed: !!r.followed, sort: i }));
  if (rows.length) {
    const { error } = await supabase.from("trade_rules").insert(rows);
    if (error) throw error;
  }
}

function revalidateAll(id?: string) {
  revalidatePath("/");
  revalidatePath("/trades");
  revalidatePath("/stats");
  if (id) revalidatePath(`/trades/${id}`);
}

export async function createTrade(input: TradeInput): Promise<ActionResult> {
  const bad = baseChecks(input);
  if (bad) return { ok: false, error: bad };
  const { supabase, profile } = await requireOnboarded();
  const [trades, fx] = await Promise.all([listTrades(supabase), gbpUsdRate()]);
  const bal = accountBalance(profile.starting_balance, trades);

  const pos = positionSize({
    balanceGbp: bal,
    riskPct: input.riskPct,
    fx: fx.rate,
    direction: input.direction,
    entry: input.entry,
    stop: input.stop,
    target: input.target,
  });
  if (!pos.ok) return { ok: false, error: pos.reason };
  if (pos.shares <= 0) return { ok: false, error: "That stop is too wide for your risk. Move it closer to entry." };

  const { data, error } = await supabase
    .from("trades")
    .insert({
      ticker: cleanTicker(input.ticker),
      direction: input.direction,
      status: "open",
      opened_at: atFor(input.openedDay),
      entry: input.entry,
      stop: input.stop,
      target: input.target,
      shares: pos.shares,
      risk_pct: input.riskPct,
      risk_gbp: pos.riskGbp,
      fx_entry: fx.rate,
      setup_id: input.setupId,
      emotion: input.emotion,
      notes: input.notes?.trim() || null,
      source: input.source ?? "quick",
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "Couldn't save the trade. Check your connection and try again." };

  try {
    await saveRules(supabase, data.id, input.rules);
  } catch {
    return { ok: false, error: "Trade saved, but the rule ticks didn't. Open it and edit to fix." };
  }
  revalidateAll();
  return { ok: true, id: data.id };
}

export async function updateTrade(id: string, input: TradeInput): Promise<ActionResult> {
  const bad = baseChecks(input);
  if (bad) return { ok: false, error: bad };
  const { supabase } = await requireOnboarded();
  const existing = await getTrade(supabase, id);
  if (!existing) return { ok: false, error: "Trade not found." };

  const shares = Number(input.shares);
  if (!Number.isFinite(shares) || shares <= 0) return { ok: false, error: "Shares must be more than 0." };
  if (!(input.entry > 0) || !(input.stop > 0)) return { ok: false, error: "Entry and stop must be more than $0." };
  if (input.entry === input.stop) return { ok: false, error: "Stop can't be the same as entry." };

  const fxEntry = existing.fx_entry;
  const patch: Record<string, unknown> = {
    ticker: cleanTicker(input.ticker),
    direction: input.direction,
    entry: input.entry,
    stop: input.stop,
    target: input.target,
    shares,
    risk_gbp: round((Math.abs(input.entry - input.stop) * shares) / fxEntry, 2),
    setup_id: input.setupId,
    emotion: input.emotion,
    notes: input.notes?.trim() || null,
    needs_details: false,
  };
  if (input.openedDay && DAY.test(input.openedDay) && input.openedDay !== londonDay(existing.opened_at)) {
    patch.opened_at = atFor(input.openedDay);
  }

  if (existing.status === "closed") {
    const exit = Number(input.exit);
    if (!(exit > 0)) return { ok: false, error: "Exit price must be more than $0." };
    const res = calcClose({
      direction: input.direction,
      entry: input.entry,
      stop: input.stop,
      exit,
      shares,
      fxEntry,
      fxExit: existing.fx_exit,
    });
    patch.exit = exit;
    patch.pnl_gbp = res.pnlGbp;
    patch.r_multiple = res.r;
    if (input.closedDay && DAY.test(input.closedDay) && input.closedDay !== londonDay(existing.closed_at!)) {
      patch.closed_at = atFor(input.closedDay);
    }
  }

  const { error } = await supabase.from("trades").update(patch).eq("id", id);
  if (error) return { ok: false, error: "Couldn't save your changes. Try again." };
  try {
    await saveRules(supabase, id, input.rules);
  } catch {
    return { ok: false, error: "Changes saved, but the rule ticks didn't. Try again." };
  }
  revalidateAll(id);
  return { ok: true, id };
}

export async function closeTradeAction(id: string, exit: number, closedDay: string | null): Promise<ActionResult> {
  if (!(exit > 0)) return { ok: false, error: "Add the price you sold (or bought back) at." };
  const { supabase } = await requireOnboarded();
  const t = await getTrade(supabase, id);
  if (!t) return { ok: false, error: "Trade not found." };
  if (t.status === "closed") return { ok: false, error: "This trade is already closed." };
  if (closedDay && DAY.test(closedDay) && closedDay < londonDay(t.opened_at)) {
    return { ok: false, error: "The close date can't be before the day you opened it." };
  }

  const fx = await gbpUsdRate();
  const res = calcClose({
    direction: t.direction,
    entry: t.entry,
    stop: t.stop,
    exit,
    shares: t.shares,
    fxEntry: t.fx_entry,
    fxExit: fx.rate,
  });
  const { error } = await supabase
    .from("trades")
    .update({
      status: "closed",
      exit,
      closed_at: atFor(closedDay),
      fx_exit: fx.rate,
      pnl_gbp: res.pnlGbp,
      r_multiple: res.r,
    })
    .eq("id", id);
  if (error) return { ok: false, error: "Couldn't close the trade. Try again." };
  revalidateAll(id);
  return { ok: true, id };
}

export async function reopenTrade(id: string): Promise<ActionResult> {
  const { supabase } = await requireOnboarded();
  const { error } = await supabase
    .from("trades")
    .update({ status: "open", exit: null, closed_at: null, fx_exit: null, pnl_gbp: null, r_multiple: null })
    .eq("id", id);
  if (error) return { ok: false, error: "Couldn't reopen the trade." };
  revalidateAll(id);
  return { ok: true, id };
}

export async function deleteTrade(id: string): Promise<ActionResult> {
  const { supabase } = await requireOnboarded();
  const { data: shots } = await supabase.from("trade_screenshots").select("storage_path").eq("trade_id", id);
  if (shots?.length) await supabase.storage.from("screenshots").remove(shots.map((s) => s.storage_path));
  const { error } = await supabase.from("trades").delete().eq("id", id);
  if (error) return { ok: false, error: "Couldn't delete the trade. Try again." };
  revalidateAll();
  return { ok: true, id };
}
