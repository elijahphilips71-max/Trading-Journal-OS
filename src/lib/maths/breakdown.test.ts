import { describe, expect, it } from "vitest";
import { groupStats, monthCalendar, shiftMonth, weekdayOf } from "./breakdown";
import type { ClosedTrade } from "./stats";

const t = (closedDay: string, pnlGbp: number, r: number, tag = "a"): ClosedTrade & { tag: string } => ({ closedDay, pnlGbp, r, allRulesFollowed: true, tag });

describe("groupStats", () => {
  it("groups and sorts best first", () => {
    const g = groupStats([t("2026-11-02", 10, 2, "a"), t("2026-11-03", -5, -1, "b"), t("2026-11-04", -5, -1, "a")], (x) => x.tag);
    expect(g).toEqual([
      { key: "a", trades: 2, wins: 1, pnl: 5, avgR: 0.5, winRate: 50 },
      { key: "b", trades: 1, wins: 0, pnl: -5, avgR: -1, winRate: 0 },
    ]);
  });
});

describe("weekdayOf", () => {
  it("names the day", () => {
    expect(weekdayOf("2026-11-27")).toBe("Fri");
    expect(weekdayOf("2026-11-30")).toBe("Mon");
  });
});

describe("monthCalendar", () => {
  it("builds Mon–Fri weeks with P&L and holidays", () => {
    const weeks = monthCalendar("2026-11", [t("2026-11-04", 9, 1.8), t("2026-11-04", -5, -1), t("2026-11-27", 3, 0.6)], (d) => d === "2026-11-26");
    // Nov 2026 starts on a Sunday, so the first week starts Mon 26 Oct
    expect(weeks[0][0]).toMatchObject({ day: "2026-10-26", inMonth: false });
    expect(weeks.every((w) => w.length === 5)).toBe(true);
    const all = weeks.flat();
    expect(all.find((c) => c.day === "2026-11-04")).toMatchObject({ pnl: 4, trades: 2, inMonth: true });
    expect(all.find((c) => c.day === "2026-11-26")?.holiday).toBe(true);
    expect(all.find((c) => c.day === "2026-11-27")?.pnl).toBe(3);
    expect(all[all.length - 1]).toMatchObject({ day: "2026-12-04", inMonth: false });
    expect(all.find((c) => c.day === "2026-11-30")?.inMonth).toBe(true);
  });
});

describe("shiftMonth", () => {
  it("moves across years", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
});
