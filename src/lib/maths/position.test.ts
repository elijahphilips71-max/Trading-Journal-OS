import { describe, expect, it } from "vitest";
import { closeTrade, positionSize } from "./position";

const base = { balanceGbp: 500, riskPct: 1, fx: 1.25, direction: "long" as const, entry: 100, stop: 98, target: 106 };

describe("positionSize", () => {
  it("sizes a long so the stop loses exactly the risk", () => {
    const r = positionSize(base);
    if (!r.ok) throw new Error(r.reason);
    expect(r.riskGbp).toBe(5);
    expect(r.riskUsd).toBe(6.25);
    expect(r.riskPerShare).toBe(2);
    expect(r.shares).toBe(3.12); // 3.125 rounded down
    expect(r.rewardRisk).toBe(3);
    expect(r.rewardGbp).toBe(14.98); // 6 × 3.12 ÷ 1.25
    expect(r.positionUsd).toBe(312);
    expect(r.positionGbp).toBe(249.6);
    expect(r.tooBig).toBe(false);
  });

  it("sizes a short", () => {
    const r = positionSize({ ...base, direction: "short", entry: 100, stop: 102, target: 95 });
    if (!r.ok) throw new Error(r.reason);
    expect(r.shares).toBe(3.12);
    expect(r.rewardRisk).toBe(2.5);
  });

  it("works with 1.5% and 2% risk", () => {
    const a = positionSize({ ...base, riskPct: 1.5 });
    const b = positionSize({ ...base, riskPct: 2 });
    expect(a.ok && a.riskGbp).toBe(7.5);
    expect(b.ok && b.riskGbp).toBe(10);
  });

  it("allows no target", () => {
    const r = positionSize({ ...base, target: null });
    expect(r.ok && r.rewardRisk).toBeNull();
    expect(r.ok && r.rewardGbp).toBeNull();
  });

  it("flags a position bigger than the account", () => {
    const r = positionSize({ ...base, entry: 500, stop: 499.9, target: 510 });
    expect(r.ok && r.tooBig).toBe(true);
  });

  it.each([
    [{ stop: 100 }, "same as entry"],
    [{ stop: 101 }, "below entry"],
    [{ target: 99 }, "above entry"],
    [{ entry: 0 }, "more than $0"],
    [{ entry: NaN }, "Fill in"],
    [{ fx: 0 }, "Exchange rate"],
  ])("rejects bad input %o", (patch, msg) => {
    const r = positionSize({ ...base, ...patch });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain(msg);
  });

  it("rejects a short with the stop below entry or target above", () => {
    expect(positionSize({ ...base, direction: "short", stop: 98, target: 95 }).ok).toBe(false);
    expect(positionSize({ ...base, direction: "short", stop: 102, target: 105 }).ok).toBe(false);
  });
});

describe("closeTrade", () => {
  const t = { direction: "long" as const, entry: 100, stop: 98, shares: 3, fxEntry: 1.25 };

  it("calculates a winning long", () => {
    expect(closeTrade({ ...t, exit: 106 })).toEqual({ pnlUsd: 18, pnlGbp: 14.4, r: 3 });
  });

  it("calculates a losing long at the stop as −1R", () => {
    expect(closeTrade({ ...t, exit: 98 })).toEqual({ pnlUsd: -6, pnlGbp: -4.8, r: -1 });
  });

  it("calculates a short", () => {
    expect(closeTrade({ ...t, direction: "short", stop: 102, exit: 95 })).toEqual({ pnlUsd: 15, pnlGbp: 12, r: 2.5 });
    expect(closeTrade({ ...t, direction: "short", stop: 102, exit: 103 }).r).toBe(-1.5);
  });

  it("uses the exit exchange rate when there is one", () => {
    expect(closeTrade({ ...t, exit: 106, fxExit: 1.2 }).pnlGbp).toBe(15);
    expect(closeTrade({ ...t, exit: 106, fxExit: 0 }).pnlGbp).toBe(14.4);
  });

  it("returns 0R when there is no risk", () => {
    expect(closeTrade({ ...t, stop: 100, exit: 101 }).r).toBe(0);
  });
});
