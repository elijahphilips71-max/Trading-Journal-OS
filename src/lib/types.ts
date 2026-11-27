export type Profile = {
  id: string;
  display_name: string | null;
  base_currency: string;
  starting_balance: number;
  start_date: string; // YYYY-MM-DD
  risk_pct: number;
  period_months: number;
  min_trades: number;
  rules_threshold: number;
  onboarded: boolean;
};

export type Rule = { id: string; text: string; active: boolean; sort: number };

export type Setup = {
  id: string;
  name: string;
  one_liner: string | null;
  checklist: string[];
  entry_rule: string | null;
  stop_rule: string | null;
  target_rule: string | null;
  avoid: string | null;
  example_image_path: string | null;
  sort: number;
};

export type Direction = "long" | "short";

export type Trade = {
  id: string;
  ticker: string;
  direction: Direction;
  status: "open" | "closed";
  opened_at: string;
  closed_at: string | null;
  entry: number;
  stop: number;
  target: number | null;
  exit: number | null;
  shares: number;
  risk_pct: number;
  risk_gbp: number;
  fx_entry: number;
  fx_exit: number | null;
  pnl_gbp: number | null;
  r_multiple: number | null;
  setup_id: string | null;
  emotion: string | null;
  notes: string | null;
  source: "quick" | "screenshot" | "csv";
  needs_details: boolean;
  created_at: string;
};

export type TradeRule = { trade_id: string; rule_id: string | null; rule_text: string; followed: boolean; sort: number };

export const EMOTIONS = ["Calm", "Confident", "Anxious", "FOMO", "Bored", "Revenge"] as const;
