import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { summarise } = await import("./summary");
const { dadReport } = await import("./dad");

const profile = {
  id: "u1",
  display_name: "Elijah",
  base_currency: "GBP",
  starting_balance: 500,
  start_date: "2026-11-03",
  risk_pct: 1,
  period_months: 3,
  min_trades: 30,
  rules_threshold: 90,
  onboarded: true,
};

const trade = (closed: string, pnl: number, notes: string | null = null) => ({
  id: "secret-id",
  ticker: "SPY",
  status: "closed",
  closed_at: closed,
  pnl_gbp: pnl,
  r_multiple: pnl / 5,
  notes,
  entry: 682.4,
  trade_rules: [{ followed: true }],
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const s = summarise(profile, [trade("2026-11-04T20:00:00Z", 9, "First trade!"), trade("2026-11-24T20:00:00Z", -5)] as any, new Date("2026-11-27T12:00:00Z"));

describe("dadReport", () => {
  it("only exposes the whitelisted fields", () => {
    const r = dadReport({ name: "Elijah", s, updatedAt: null, latest: { ticker: "SPY", pnl_gbp: 9, notes: "First trade!" }, coach: "Good.", showNotes: false, showAi: false });
    expect(Object.keys(r).sort()).toEqual(["coach", "dayLine", "headline", "latest", "months", "name", "targets", "tone", "trades", "updatedAt"]);
    expect(r.latest).toBeNull();
    expect(r.coach).toBeNull();
    expect(JSON.stringify(r)).not.toContain("secret-id");
    expect(JSON.stringify(r)).not.toContain("682.4");
  });

  it("shows months, targets and trade count", () => {
    const r = dadReport({ name: "Elijah", s, updatedAt: null, showNotes: false, showAi: false });
    expect(r.months.map((m) => m.label)).toEqual(["NOV", "DEC", "JAN"]);
    expect(r.months[0].returnPct).toBeCloseTo(0.8);
    expect(r.months[1].returnPct).toBeNull();
    expect(r.targets).toHaveLength(4);
    expect(r.trades).toEqual({ done: 2, needed: 30 });
    expect(r.dayLine).toBe("Day 25 of 92");
    expect(r.headline).toMatch(/of 4 targets met/);
  });

  it("adds the note and coach summary only when switched on", () => {
    const r = dadReport({ name: "Elijah", s, updatedAt: null, latest: { ticker: "SPY", pnl_gbp: 9, notes: " First trade! " }, coach: "Disciplined.", showNotes: true, showAi: true });
    expect(r.latest).toEqual({ ticker: "SPY", pnlGbp: 9, note: "First trade!" });
    expect(r.coach).toBe("Disciplined.");
  });
});
