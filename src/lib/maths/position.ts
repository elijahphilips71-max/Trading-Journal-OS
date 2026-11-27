import { floorTo, round } from "./round";

export type Direction = "long" | "short";

export type PositionInput = {
  /** Current paper account balance in £. */
  balanceGbp: number;
  /** Risk per trade as a percentage, e.g. 1 for 1%. */
  riskPct: number;
  /** US dollars per £1 (GBP→USD rate). */
  fx: number;
  direction: Direction;
  entry: number;
  stop: number;
  target?: number | null;
};

export type PositionResult =
  | { ok: false; reason: string }
  | {
      ok: true;
      riskGbp: number;
      riskUsd: number;
      riskPerShare: number;
      /** Shares to buy, fractional, rounded down to 2 dp. */
      shares: number;
      /** Reward ÷ risk, e.g. 2.5 means you could make 2.5× what you risk. Null without a target. */
      rewardRisk: number | null;
      rewardGbp: number | null;
      positionUsd: number;
      positionGbp: number;
      /** True when the position costs more than the whole account. */
      tooBig: boolean;
    };

/**
 * Position size from SPEC §5:
 * risk_gbp = balance × risk%, risk_usd = risk_gbp × fx,
 * risk_per_share = |entry − stop|, shares = risk_usd ÷ risk_per_share.
 */
export function positionSize(i: PositionInput): PositionResult {
  if (![i.balanceGbp, i.riskPct, i.fx, i.entry, i.stop].every(Number.isFinite)) {
    return { ok: false, reason: "Fill in entry and stop." };
  }
  if (i.entry <= 0 || i.stop <= 0) return { ok: false, reason: "Prices must be more than $0." };
  if (i.fx <= 0) return { ok: false, reason: "Exchange rate must be more than 0." };
  if (i.entry === i.stop) return { ok: false, reason: "Stop can't be the same as entry." };
  if (i.direction === "long" && i.stop > i.entry) return { ok: false, reason: "For a long (buy), the stop goes below entry." };
  if (i.direction === "short" && i.stop < i.entry) return { ok: false, reason: "For a short (sell), the stop goes above entry." };

  const hasTarget = i.target != null && Number.isFinite(i.target) && i.target > 0;
  if (hasTarget) {
    const t = i.target as number;
    if (i.direction === "long" && t <= i.entry) return { ok: false, reason: "For a long (buy), the target goes above entry." };
    if (i.direction === "short" && t >= i.entry) return { ok: false, reason: "For a short (sell), the target goes below entry." };
  }

  const riskGbp = (i.balanceGbp * i.riskPct) / 100;
  const riskUsd = riskGbp * i.fx;
  const riskPerShare = Math.abs(i.entry - i.stop);
  const shares = floorTo(riskUsd / riskPerShare, 2);
  const positionUsd = shares * i.entry;
  const positionGbp = positionUsd / i.fx;

  let rewardRisk: number | null = null;
  let rewardGbp: number | null = null;
  if (hasTarget) {
    const rewardPerShare = Math.abs((i.target as number) - i.entry);
    rewardRisk = round(rewardPerShare / riskPerShare, 2);
    rewardGbp = round((rewardPerShare * shares) / i.fx, 2);
  }

  return {
    ok: true,
    riskGbp: round(riskGbp, 2),
    riskUsd: round(riskUsd, 2),
    riskPerShare: round(riskPerShare, 4),
    shares,
    rewardRisk,
    rewardGbp,
    positionUsd: round(positionUsd, 2),
    positionGbp: round(positionGbp, 2),
    tooBig: positionGbp > i.balanceGbp,
  };
}

export type CloseInput = {
  direction: Direction;
  entry: number;
  stop: number;
  exit: number;
  shares: number;
  fxEntry: number;
  /** Rate when the trade closed. If missing, the entry rate is used. */
  fxExit?: number | null;
};

export type CloseResult = { pnlUsd: number; pnlGbp: number; r: number };

/**
 * P&L on close (SPEC §5). Long: (exit − entry) × shares; short is reversed.
 * £ P&L uses the exchange rate at exit (that's when the dollars would be turned
 * back into pounds), falling back to the entry rate.
 * R = pnl_usd ÷ (risk_per_share × shares): how many "risks" you made or lost.
 */
export function closeTrade(i: CloseInput): CloseResult {
  const sign = i.direction === "long" ? 1 : -1;
  const pnlUsd = (i.exit - i.entry) * i.shares * sign;
  const fx = i.fxExit && i.fxExit > 0 ? i.fxExit : i.fxEntry;
  const pnlGbp = pnlUsd / fx;
  const riskUsd = Math.abs(i.entry - i.stop) * i.shares;
  const r = riskUsd > 0 ? pnlUsd / riskUsd : 0;
  return { pnlUsd: round(pnlUsd, 2), pnlGbp: round(pnlGbp, 2), r: round(r, 2) };
}
