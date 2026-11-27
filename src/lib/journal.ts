import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { balance as calcBalance, londonDay, type ClosedTrade } from "./maths";
import type { Rule, Setup, Trade, TradeRule } from "./types";

const TRADE_NUMS = [
  "entry",
  "stop",
  "target",
  "exit",
  "shares",
  "risk_pct",
  "risk_gbp",
  "fx_entry",
  "fx_exit",
  "pnl_gbp",
  "r_multiple",
] as const;

/** Postgres numeric columns arrive as strings; turn them into numbers. */
export function toTrade(row: Record<string, unknown>): Trade {
  const t = { ...row } as Record<string, unknown>;
  for (const k of TRADE_NUMS) t[k] = t[k] == null ? null : Number(t[k]);
  return t as Trade;
}

export type TradeWithRules = Trade & { trade_rules: TradeRule[] };

export async function listTrades(supabase: SupabaseClient): Promise<TradeWithRules[]> {
  const { data, error } = await supabase
    .from("trades")
    .select("*, trade_rules(trade_id, rule_id, rule_text, followed, sort)")
    .order("opened_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    ...toTrade(r),
    trade_rules: ((r.trade_rules as TradeRule[]) ?? []).sort((a, b) => a.sort - b.sort),
  }));
}

export async function getTrade(supabase: SupabaseClient, id: string): Promise<TradeWithRules | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await supabase
    .from("trades")
    .select("*, trade_rules(trade_id, rule_id, rule_text, followed, sort)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return {
    ...toTrade(data),
    trade_rules: ((data.trade_rules as TradeRule[]) ?? []).sort((a, b) => a.sort - b.sort),
  };
}

export async function listRules(supabase: SupabaseClient): Promise<Rule[]> {
  const { data } = await supabase.from("rules").select("id, text, active, sort").eq("active", true).order("sort");
  return (data ?? []) as Rule[];
}

export async function listSetups(supabase: SupabaseClient): Promise<Setup[]> {
  const { data } = await supabase.from("setups").select("*").order("sort");
  return (data ?? []) as Setup[];
}

/** Closed trades in the shape the maths module wants. */
export function toClosed(trades: TradeWithRules[]): ClosedTrade[] {
  return trades
    .filter((t) => t.status === "closed" && t.closed_at && t.pnl_gbp != null)
    .map((t) => ({
      closedDay: londonDay(t.closed_at!),
      pnlGbp: t.pnl_gbp ?? 0,
      r: t.r_multiple ?? 0,
      allRulesFollowed: t.trade_rules.length > 0 && t.trade_rules.every((r) => r.followed),
    }));
}

export function accountBalance(startingBalance: number, trades: TradeWithRules[]) {
  return calcBalance(startingBalance, toClosed(trades));
}

/** Most recent distinct tickers, for the quick-pick chips. */
export function recentTickers(trades: Trade[], fallback = ["SPY", "QQQ", "AAPL", "NVDA", "MSFT"]) {
  const seen: string[] = [];
  for (const t of trades) if (!seen.includes(t.ticker)) seen.push(t.ticker);
  for (const f of fallback) if (!seen.includes(f)) seen.push(f);
  return seen.slice(0, 6);
}

export type Screenshot = { id: string; kind: "entry" | "exit"; storage_path: string; url: string | null };

/** A trade's screenshots with short-lived links (the bucket is private). */
export async function listScreenshots(supabase: SupabaseClient, tradeId: string): Promise<Screenshot[]> {
  const { data } = await supabase
    .from("trade_screenshots")
    .select("id, kind, storage_path")
    .eq("trade_id", tradeId)
    .order("created_at");
  const rows = (data ?? []) as Omit<Screenshot, "url">[];
  if (!rows.length) return [];
  const { data: signed } = await supabase.storage
    .from("screenshots")
    .createSignedUrls(rows.map((r) => r.storage_path), 60 * 60);
  const byPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  return rows.map((r) => ({ ...r, url: byPath.get(r.storage_path) ?? null }));
}
