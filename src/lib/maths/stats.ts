import { round } from "./round";

/** The fields of a closed trade the maths needs. */
export type ClosedTrade = {
  /** UK calendar day the trade closed, YYYY-MM-DD. */
  closedDay: string;
  pnlGbp: number;
  r: number;
  /** All rules ticked when it was logged. */
  allRulesFollowed: boolean;
};

export type Stats = {
  trades: number;
  wins: number;
  losses: number;
  /** 0–100. Break-even trades count as neither win nor loss. */
  winRate: number | null;
  netPnl: number;
  grossWon: number;
  grossLost: number;
  avgWin: number | null;
  /** Shown as a positive number. */
  avgLoss: number | null;
  /** Money won ÷ money lost. Null when nothing has been lost yet. */
  profitFactor: number | null;
  /** Average R per trade (also called expectancy). */
  avgR: number | null;
  /** 0–100 */
  rulesFollowedPct: number | null;
};

export function computeStats(trades: ClosedTrade[]): Stats {
  const wins = trades.filter((t) => t.pnlGbp > 0);
  const losses = trades.filter((t) => t.pnlGbp < 0);
  const grossWon = wins.reduce((s, t) => s + t.pnlGbp, 0);
  const grossLost = Math.abs(losses.reduce((s, t) => s + t.pnlGbp, 0));
  const n = trades.length;
  return {
    trades: n,
    wins: wins.length,
    losses: losses.length,
    winRate: n ? round((wins.length / n) * 100, 1) : null,
    netPnl: round(grossWon - grossLost, 2),
    grossWon: round(grossWon, 2),
    grossLost: round(grossLost, 2),
    avgWin: wins.length ? round(grossWon / wins.length, 2) : null,
    avgLoss: losses.length ? round(grossLost / losses.length, 2) : null,
    profitFactor: grossLost > 0 ? round(grossWon / grossLost, 2) : null,
    avgR: n ? round(trades.reduce((s, t) => s + t.r, 0) / n, 2) : null,
    rulesFollowedPct: n ? round((trades.filter((t) => t.allRulesFollowed).length / n) * 100, 1) : null,
  };
}

/** Balance = starting balance + all closed £ P&L. */
export function balance(startingBalance: number, trades: Pick<ClosedTrade, "pnlGbp">[]): number {
  return round(startingBalance + trades.reduce((s, t) => s + t.pnlGbp, 0), 2);
}

/** Running balance after each closed trade, oldest first (for the equity curve). */
export function equityCurve(startingBalance: number, trades: ClosedTrade[]): { day: string; balance: number }[] {
  const sorted = [...trades].sort((a, b) => a.closedDay.localeCompare(b.closedDay));
  let bal = startingBalance;
  return sorted.map((t) => {
    bal += t.pnlGbp;
    return { day: t.closedDay, balance: round(bal, 2) };
  });
}
