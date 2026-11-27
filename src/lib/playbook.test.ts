import { describe, expect, it } from "vitest";
import { biasVerdict, isTradingDay, nextTradingDay, planDay } from "./playbook";

describe("biasVerdict", () => {
  it("needs both answers", () => {
    expect(biasVerdict("up", null)).toBeNull();
  });
  it("maps trend and zone to a verdict", () => {
    expect(biasVerdict("up", "discount", 104.1)?.title).toBe("Look for buys");
    expect(biasVerdict("up", "discount", 104.1)?.why).toContain("$104.1");
    expect(biasVerdict("up", "premium")?.title).toBe("Wait");
    expect(biasVerdict("sideways", "discount")?.title).toBe("Be picky");
    expect(biasVerdict("sideways", "premium")?.title).toBe("Sit out");
    expect(biasVerdict("down", "discount")?.key).toBe("sit_out");
  });
});

describe("trading days", () => {
  it("skips weekends and US holidays", () => {
    expect(isTradingDay("2026-11-26")).toBe(false); // Thanksgiving
    expect(isTradingDay("2026-11-28")).toBe(false); // Saturday
    expect(nextTradingDay("2026-11-25")).toBe("2026-11-27");
    expect(nextTradingDay("2026-11-27")).toBe("2026-11-30");
  });
  it("plans for today until 21:00 UK, then the next trading day", () => {
    expect(planDay("2026-11-30", 10)).toBe("2026-11-30");
    expect(planDay("2026-11-30", 21)).toBe("2026-12-01");
    expect(planDay("2026-11-28", 10)).toBe("2026-11-30");
  });
});
