import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dadReport, type DadReport } from "./dad";
import type { TradeWithRules } from "./journal";
import { summarise } from "./summary";
import type { Profile } from "./types";

export type ShareLink = { token: string; enabled: boolean; show_notes: boolean; show_ai: boolean };

const PROFILE_COLS = "id, display_name, base_currency, starting_balance, start_date, risk_pct, period_months, min_trades, rules_threshold, onboarded";

/**
 * Build Dad's summary for one user. Every query filters by user_id so it is
 * safe with the service-role client too. Only the DadReport leaves this function.
 */
export async function loadDadReport(supabase: SupabaseClient, userId: string, link: Pick<ShareLink, "show_notes" | "show_ai">): Promise<DadReport | null> {
  const [{ data: prof }, { data: rows }, coachRes] = await Promise.all([
    supabase.from("profiles").select(PROFILE_COLS).eq("id", userId).maybeSingle(),
    supabase
      .from("trades")
      .select("ticker, status, closed_at, pnl_gbp, r_multiple, notes, updated_at, trade_rules(followed)")
      .eq("user_id", userId),
    link.show_ai
      ? supabase.from("ai_patterns").select("bullets").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (!prof) return null;

  const profile = { ...prof, starting_balance: Number(prof.starting_balance), risk_pct: Number(prof.risk_pct), rules_threshold: Number(prof.rules_threshold) } as Profile;
  const trades = (rows ?? []).map((r) => ({
    ...r,
    pnl_gbp: r.pnl_gbp == null ? null : Number(r.pnl_gbp),
    r_multiple: r.r_multiple == null ? null : Number(r.r_multiple),
    trade_rules: r.trade_rules ?? [],
  })) as unknown as (TradeWithRules & { updated_at: string })[];

  const s = summarise(profile, trades);
  const latest = trades
    .filter((t) => t.status === "closed" && t.closed_at && t.notes?.trim())
    .sort((a, b) => (b.closed_at ?? "").localeCompare(a.closed_at ?? ""))[0];
  const updatedAt = trades.reduce<string | null>((m, t) => (!m || t.updated_at > m ? t.updated_at : m), null);
  const bullets = (coachRes.data?.bullets as { title: string; detail: string }[] | undefined) ?? [];
  const coach = bullets.length ? bullets.slice(0, 2).map((b) => `${b.title}.`).join(" ") : null;

  return dadReport({ name: profile.display_name, s, updatedAt, latest: latest ?? null, coach, showNotes: link.show_notes, showAi: link.show_ai });
}
