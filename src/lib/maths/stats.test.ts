import { describe, expect, it } from "vitest";
import { balance, computeStats, equityCurve, type ClosedTrade } from "./stats";
import { addDays, addMonths, daysBetween, londonDay } from "./dates";
import { floorTo, round } from "./round";

const t = (closedDay: string, pnlGbp: number, r: number, allRulesFollowed = true): ClosedTrade => ({ closedDay, pnlGbp, r, allRulesFollowed });

describe("computeStats", () => {
  it("handles no trades", () => {
    const s = computeStats([]);
    expect(s.trades).toBe(0);
    expect(s.winRate).toBeNull();
    expect(s.avgWin).toBeNull();
    expect(s.profitFactor).toBeNull();
    expect(s.avgR).toBeNull();
    expect(s.rulesFollowedPct).toBeNull();
    expect(s.netPnl).toBe(0);
  });

  it("adds up wins, losses and ratios", () => {
    const s = computeStats([t("2026-11-04", 9, 1.8), t("2026-11-06", -5, -1), t("2026-11-10", 10.5, 2.1), t("2026-11-11", -5, -1, false), t("2026-11-12", 0, 0)]);
    expect(s.trades).toBe(5);
    expect(s.wins).toBe(2);
    expect(s.losses).toBe(2);
    expect(s.winRate).toBe(40);
    expect(s.grossWon).toBe(19.5);
    expect(s.grossLost).toBe(10);
    expect(s.netPnl).toBe(9.5);
    expect(s.avgWin).toBe(9.75);
    expect(s.avgLoss).toBe(5);
    expect(s.profitFactor).toBe(1.95);
    expect(s.avgR).toBe(0.38);
    expect(s.rulesFollowedPct).toBe(80);
  });

  it("has no profit factor with no losses", () => {
    expect(computeStats([t("2026-11-04", 9, 1.8)]).profitFactor).toBeNull();
  });
});

describe("balance and equity curve", () => {
  it("adds closed P&L to the starting balance", () => {
    expect(balance(500, [{ pnlGbp: 9 }, { pnlGbp: -5 }])).toBe(504);
  });
  it("builds a running balance in date order", () => {
    expect(equityCurve(500, [t("2026-11-06", -5, -1), t("2026-11-04", 9, 1.8)])).toEqual([
      { day: "2026-11-04", balance: 509 },
      { day: "2026-11-06", balance: 504 },
    ]);
  });
});

describe("dates", () => {
  it("adds months and clamps to month end", () => {
    expect(addMonths("2026-11-03", 3)).toBe("2027-02-03");
    expect(addMonths("2027-01-31", 1)).toBe("2027-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
  });
  it("adds days and counts days", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(daysBetween("2026-11-03", "2027-02-03")).toBe(92);
  });
  it("uses the UK calendar day, including in British Summer Time", () => {
    expect(londonDay("2026-11-27T23:30:00Z")).toBe("2026-11-27"); // GMT
    expect(londonDay("2026-06-30T23:30:00Z")).toBe("2026-07-01"); // BST = UTC+1
    expect(londonDay(new Date("2026-06-30T22:30:00Z"))).toBe("2026-06-30");
  });
});

describe("rounding", () => {
  it("rounds and floors", () => {
    expect(round(1.005, 2)).toBe(1.01);
    expect(floorTo(3.129, 2)).toBe(3.12);
    expect(floorTo(0.3 * 3, 2)).toBe(0.9);
  });
});
