import { balance, equityCurve, evaluateTargets, londonDay } from "./maths";
import type { TradeWithRules } from "./journal";
import { toClosed } from "./journal";
import type { Profile } from "./types";

/** Everything Home, Stats and Dad's view need, worked out from the trades. */
export function summarise(profile: Profile, trades: TradeWithRules[], now = new Date()) {
  const today = londonDay(now);
  const closed = toClosed(trades);
  const cfg = {
    startDate: profile.start_date,
    startingBalance: profile.starting_balance,
    periodMonths: profile.period_months,
    minTrades: profile.min_trades,
    rulesThreshold: profile.rules_threshold,
  };
  const evald = evaluateTargets(cfg, closed, today);
  const bal = balance(profile.starting_balance, closed);
  const change = bal - profile.starting_balance;
  return {
    today,
    ...evald,
    balance: bal,
    change,
    changePct: profile.starting_balance ? (change / profile.starting_balance) * 100 : 0,
    riskPerTrade: (bal * profile.risk_pct) / 100,
    curve: equityCurve(profile.starting_balance, closed),
    open: trades.filter((t) => t.status === "open"),
    recentClosed: trades
      .filter((t) => t.status === "closed")
      .sort((a, b) => (b.closed_at ?? "").localeCompare(a.closed_at ?? ""))
      .slice(0, 3),
  };
}
