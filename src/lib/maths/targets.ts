import { addDays, addMonths, daysBetween } from "./dates";
import { round } from "./round";
import { computeStats, type ClosedTrade } from "./stats";

export type TargetConfig = {
  /** Day 1 of the paper period, YYYY-MM-DD. */
  startDate: string;
  startingBalance: number;
  periodMonths: number;
  minTrades: number;
  /** % of trades that must have every rule ticked. */
  rulesThreshold: number;
};

export type TargetStatus = "on_track" | "done" | "passing" | "watch" | "failing" | "not_started";

export type Target = {
  key: "profitable_months" | "win_vs_loss" | "no_bad_month" | "rules";
  name: string;
  value: string;
  status: TargetStatus;
  hint: string;
  /** Counts toward "targets met X of 4". */
  met: boolean;
};

export type MonthResult = {
  index: number; // 0-based
  start: string; // first day, inclusive
  end: string; // last day, inclusive
  startBalance: number;
  pnl: number;
  /** Return in %, month P&L ÷ balance at month start. */
  returnPct: number;
  trades: number;
  state: "ended" | "current" | "future";
};

export type Progress = {
  /** 1-based, clamped to the period. */
  day: number;
  totalDays: number;
  month: number;
  months: number;
  /** 0–100 */
  pct: number;
  endDate: string; // last day of the period
  finished: boolean;
  started: boolean;
};

/**
 * The period is split into months counted from the start date
 * (e.g. 3 Nov → 2 Dec is month 1), not calendar months, so a mid-month start
 * still gets three full months.
 */
export function periodMonths(cfg: TargetConfig, trades: ClosedTrade[], today: string): MonthResult[] {
  const results: MonthResult[] = [];
  let bal = cfg.startingBalance;
  // Trades closed before day 1 still move the balance, but don't count toward a month.
  for (const t of trades) if (t.closedDay < cfg.startDate) bal += t.pnlGbp;
  for (let i = 0; i < cfg.periodMonths; i++) {
    const start = addMonths(cfg.startDate, i);
    const end = addDays(addMonths(cfg.startDate, i + 1), -1);
    const inMonth = trades.filter((t) => t.closedDay >= start && t.closedDay <= end);
    const pnl = inMonth.reduce((s, t) => s + t.pnlGbp, 0);
    const state = today > end ? "ended" : today >= start ? "current" : "future";
    results.push({
      index: i,
      start,
      end,
      startBalance: round(bal, 2),
      pnl: round(pnl, 2),
      returnPct: bal > 0 ? round((pnl / bal) * 100, 2) : 0,
      trades: inMonth.length,
      state,
    });
    bal += pnl;
  }
  return results;
}

export function periodProgress(cfg: TargetConfig, today: string): Progress {
  const endExclusive = addMonths(cfg.startDate, cfg.periodMonths);
  const totalDays = daysBetween(cfg.startDate, endExclusive);
  const raw = daysBetween(cfg.startDate, today) + 1;
  const day = Math.min(Math.max(raw, 1), totalDays);
  let month = 1;
  for (let i = 0; i < cfg.periodMonths; i++) if (today >= addMonths(cfg.startDate, i)) month = i + 1;
  return {
    day,
    totalDays,
    month,
    months: cfg.periodMonths,
    pct: raw < 1 ? 0 : round((day / totalDays) * 100, 1),
    endDate: addDays(endExclusive, -1),
    finished: today >= endExclusive,
    started: raw >= 1,
  };
}

const gbp = (n: number) => `£${Math.abs(n).toFixed(2)}`;
const signedPct = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)}%`;

/** Dad's 4 targets (SPEC §4). Only trades closed inside the period count. */
export function evaluateTargets(cfg: TargetConfig, allTrades: ClosedTrade[], today: string) {
  const months = periodMonths(cfg, allTrades, today);
  const periodEnd = months[months.length - 1].end;
  const trades = allTrades.filter((t) => t.closedDay >= cfg.startDate && t.closedDay <= periodEnd);
  const stats = computeStats(trades);
  const needed = Math.min(2, cfg.periodMonths);
  const targets: Target[] = [];

  // 1. Profitable in 2 of 3 months
  {
    const endedProfitable = months.filter((m) => m.state === "ended" && m.pnl > 0).length;
    const current = months.find((m) => m.state === "current");
    const stillOpen = months.filter((m) => m.state !== "ended").length;
    const shown = endedProfitable + (current && current.pnl > 0 ? 1 : 0);
    let status: TargetStatus;
    let hint: string;
    if (endedProfitable >= needed) {
      status = "done";
      hint = `Done. You finished ${needed} months in profit.`;
    } else if (endedProfitable + stillOpen < needed) {
      status = "failing";
      hint = `Not enough months left to get ${needed} profitable months.`;
    } else if (trades.length === 0) {
      status = "not_started";
      hint = `End at least ${needed} of the ${cfg.periodMonths} months up overall.`;
    } else {
      status = "on_track";
      const left = needed - endedProfitable;
      hint = current
        ? `This month is ${current.pnl >= 0 ? "up" : "down"} ${gbp(current.pnl)} so far. You need ${left} more profitable month${left === 1 ? "" : "s"}.`
        : `You need ${left} more profitable month${left === 1 ? "" : "s"}.`;
    }
    targets.push({
      key: "profitable_months",
      name: `Profitable ${needed} of ${cfg.periodMonths} months`,
      value: `${shown} of ${cfg.periodMonths}`,
      status,
      hint,
      met: status === "done",
    });
  }

  // 2. Average win bigger than average loss
  {
    const { avgWin, avgLoss } = stats;
    let status: TargetStatus;
    let hint: string;
    let value = "—";
    if (avgWin == null && avgLoss == null) {
      status = "not_started";
      hint = "When you win, win more than you lose when you're wrong.";
    } else if (avgLoss == null) {
      status = "passing";
      value = `${gbp(avgWin!)} vs £0.00`;
      hint = "No losing trades yet.";
    } else if (avgWin == null) {
      status = "failing";
      value = `£0.00 vs ${gbp(avgLoss)}`;
      hint = "No winning trades yet. Let a winner reach its target.";
    } else {
      value = `${gbp(avgWin)} vs ${gbp(avgLoss)}`;
      status = avgWin > avgLoss ? "passing" : "failing";
      hint =
        status === "passing"
          ? "Your average win is bigger than your average loss."
          : "Your average loss is bigger than your average win. Keep losses at your stop.";
    }
    targets.push({ key: "win_vs_loss", name: "Average win bigger than average loss", value, status, hint, met: status === "passing" });
  }

  // 3. No month below −5%
  {
    const counted = months.filter((m) => m.state !== "future" && m.trades > 0);
    const worst = counted.length ? Math.min(...counted.map((m) => m.returnPct)) : null;
    let status: TargetStatus;
    let hint: string;
    if (worst == null) {
      status = "not_started";
      hint = "Never lose more than 5% of your account in a month.";
    } else if (worst < -5) {
      status = "failing";
      hint = "One month fell more than 5%. Cut your risk per trade.";
    } else if (worst < -3) {
      status = "watch";
      hint = "A month is down more than 3%. Slow down before it reaches 5%.";
    } else {
      status = "passing";
      hint = "No month has dropped more than 5%.";
    }
    targets.push({
      key: "no_bad_month",
      name: "No month below −5%",
      value: worst == null ? "—" : `worst ${signedPct(worst)}`,
      status,
      hint,
      met: status === "passing" || status === "watch",
    });
  }

  // 4. Rules followed on 90%+ of trades
  {
    const pct = stats.rulesFollowedPct;
    let status: TargetStatus;
    let hint: string;
    if (pct == null) {
      status = "not_started";
      hint = `Tick every rule on at least ${cfg.rulesThreshold}% of trades.`;
    } else if (pct >= cfg.rulesThreshold) {
      status = "passing";
      hint = `You followed all your rules on ${pct}% of trades.`;
    } else if (pct >= cfg.rulesThreshold - 5) {
      status = "watch";
      hint = `Just under ${cfg.rulesThreshold}%. Your next trades need every rule ticked.`;
    } else {
      status = "failing";
      hint = `Below ${cfg.rulesThreshold}%. Only take trades where every rule is ticked.`;
    }
    targets.push({
      key: "rules",
      name: `Rules followed on ${cfg.rulesThreshold}%+ of trades`,
      value: pct == null ? "—" : `${Math.round(pct)}%`,
      status,
      hint,
      met: status === "passing",
    });
  }

  const progress = periodProgress(cfg, today);
  const tradesDone = trades.length;
  const enoughTrades = tradesDone >= cfg.minTrades;
  const met = targets.filter((t) => t.met).length;

  /** Overall pill on the "Road to a real account" card. */
  let overall: "on_track" | "watch" | "failing" | "passed" | "not_started";
  if (targets.some((t) => t.status === "failing")) overall = "failing";
  else if (progress.finished && met === 4 && enoughTrades) overall = "passed";
  else if (targets.some((t) => t.status === "watch")) overall = "watch";
  else if (tradesDone === 0) overall = "not_started";
  else overall = "on_track";

  return {
    targets,
    met,
    months,
    progress,
    stats,
    trades: { done: tradesDone, needed: cfg.minTrades, pct: Math.min(100, round((tradesDone / cfg.minTrades) * 100, 1)) },
    overall,
  };
}
