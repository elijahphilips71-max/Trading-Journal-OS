import { describe, expect, it } from "vitest";
import { evaluateTargets, periodMonths, periodProgress, type TargetConfig } from "./targets";
import type { ClosedTrade } from "./stats";

const cfg: TargetConfig = { startDate: "2026-11-03", startingBalance: 500, periodMonths: 3, minTrades: 30, rulesThreshold: 90 };
const t = (closedDay: string, pnlGbp: number, r = pnlGbp / 5, allRulesFollowed = true): ClosedTrade => ({ closedDay, pnlGbp, r, allRulesFollowed });
const byKey = (res: ReturnType<typeof evaluateTargets>, k: string) => res.targets.find((x) => x.key === k)!;

describe("periodProgress", () => {
  it("counts days and months from the start date", () => {
    const p = periodProgress(cfg, "2026-11-27");
    expect(p.day).toBe(25);
    expect(p.totalDays).toBe(92);
    expect(p.month).toBe(1);
    expect(p.endDate).toBe("2027-02-02");
    expect(p.finished).toBe(false);
    expect(p.started).toBe(true);
  });
  it("moves to month 2 and finishes after the end", () => {
    expect(periodProgress(cfg, "2026-12-03").month).toBe(2);
    const done = periodProgress(cfg, "2027-02-03");
    expect(done.finished).toBe(true);
    expect(done.day).toBe(92);
  });
  it("handles a start date in the future", () => {
    const p = periodProgress(cfg, "2026-11-01");
    expect(p.started).toBe(false);
    expect(p.day).toBe(1);
    expect(p.pct).toBe(0);
  });
});

describe("periodMonths", () => {
  it("splits trades into months and tracks start balances", () => {
    const months = periodMonths(cfg, [t("2026-11-04", 10), t("2026-12-02", -5), t("2026-12-03", 20)], "2026-12-10");
    expect(months.map((m) => [m.start, m.end, m.state])).toEqual([
      ["2026-11-03", "2026-12-02", "ended"],
      ["2026-12-03", "2027-01-02", "current"],
      ["2027-01-03", "2027-02-02", "future"],
    ]);
    expect(months[0].pnl).toBe(5);
    expect(months[1].startBalance).toBe(505);
    expect(months[1].returnPct).toBe(3.96);
  });
  it("counts trades closed before day 1 in the balance only", () => {
    const months = periodMonths(cfg, [t("2026-10-01", 50)], "2026-11-10");
    expect(months[0].startBalance).toBe(550);
    expect(months[0].trades).toBe(0);
  });
});

describe("evaluateTargets", () => {
  it("shows not started with no trades", () => {
    const res = evaluateTargets(cfg, [], "2026-11-05");
    expect(res.targets.every((x) => x.status === "not_started")).toBe(true);
    expect(res.met).toBe(0);
    expect(res.overall).toBe("not_started");
    expect(res.trades).toEqual({ done: 0, needed: 30, pct: 0 });
  });

  it("profitable months: on track, done and failing", () => {
    expect(byKey(evaluateTargets(cfg, [t("2026-11-04", 10)], "2026-11-20"), "profitable_months").status).toBe("on_track");
    const done = evaluateTargets(cfg, [t("2026-11-04", 10), t("2026-12-04", 10)], "2027-01-05");
    expect(byKey(done, "profitable_months").status).toBe("done");
    expect(byKey(done, "profitable_months").met).toBe(true);
    // Two losing months ended: only one left, can't reach 2.
    const fail = evaluateTargets(cfg, [t("2026-11-04", -10), t("2026-12-04", -10)], "2027-01-05");
    expect(byKey(fail, "profitable_months").status).toBe("failing");
    expect(fail.overall).toBe("failing");
  });

  it("shows the current month in the count while it's in profit", () => {
    const res = evaluateTargets(cfg, [t("2026-11-04", 10)], "2026-11-20");
    expect(byKey(res, "profitable_months").value).toBe("1 of 3");
  });

  it("average win vs average loss", () => {
    expect(byKey(evaluateTargets(cfg, [t("2026-11-04", 10), t("2026-11-05", -5)], "2026-11-20"), "win_vs_loss").status).toBe("passing");
    expect(byKey(evaluateTargets(cfg, [t("2026-11-04", 4), t("2026-11-05", -5)], "2026-11-20"), "win_vs_loss").status).toBe("failing");
    expect(byKey(evaluateTargets(cfg, [t("2026-11-04", 4)], "2026-11-20"), "win_vs_loss").status).toBe("passing");
    expect(byKey(evaluateTargets(cfg, [t("2026-11-04", -4)], "2026-11-20"), "win_vs_loss").status).toBe("failing");
    // Equal is not "bigger"
    expect(byKey(evaluateTargets(cfg, [t("2026-11-04", 5), t("2026-11-05", -5)], "2026-11-20"), "win_vs_loss").status).toBe("failing");
  });

  it("no month below −5%, with a warning at −3%", () => {
    const at = (pnl: number) => byKey(evaluateTargets(cfg, [t("2026-11-04", pnl)], "2026-11-20"), "no_bad_month");
    expect(at(-10).status).toBe("passing"); // −2%
    expect(at(-20).status).toBe("watch"); // −4%
    expect(at(-25).status).toBe("watch"); // exactly −5% is allowed, with a warning
    expect(at(-25).met).toBe(true);
    expect(at(-25.5).status).toBe("failing");
    expect(at(-20).value).toBe("worst −4.0%");
  });

  it("rules followed: passing, watch it and failing", () => {
    const mk = (followed: number, total: number) =>
      Array.from({ length: total }, (_, i) => t("2026-11-04", 1, 0.2, i < followed));
    expect(byKey(evaluateTargets(cfg, mk(9, 10), "2026-11-20"), "rules").status).toBe("passing");
    expect(byKey(evaluateTargets(cfg, mk(17, 20), "2026-11-20"), "rules").status).toBe("watch"); // 85%
    expect(byKey(evaluateTargets(cfg, mk(8, 10), "2026-11-20"), "rules").status).toBe("failing");
  });

  it("ignores trades outside the period for the targets", () => {
    const res = evaluateTargets(cfg, [t("2026-10-01", -100), t("2027-03-01", -100), t("2026-11-04", 5)], "2026-11-20");
    expect(res.trades.done).toBe(1);
    expect(res.stats.netPnl).toBe(5);
  });

  it("passes overall only after the period with all 4 targets and enough trades", () => {
    const trades: ClosedTrade[] = [];
    for (let i = 0; i < 30; i++) trades.push(t(i < 15 ? "2026-11-10" : "2026-12-10", i % 3 === 0 ? -5 : 8));
    const during = evaluateTargets(cfg, trades, "2027-01-10");
    expect(during.met).toBe(4);
    expect(during.overall).toBe("on_track");
    const after = evaluateTargets(cfg, trades, "2027-02-05");
    expect(after.overall).toBe("passed");
    expect(after.trades.pct).toBe(100);
  });

  it("shows watch it overall when a target needs care", () => {
    const res = evaluateTargets(cfg, [t("2026-11-04", -20), t("2026-11-05", 30)], "2026-11-20");
    // month = +2%, rules all followed, win > loss → nothing to watch
    expect(res.overall).toBe("on_track");
    const watch = evaluateTargets(cfg, [t("2026-11-04", -20)], "2026-11-20");
    expect(byKey(watch, "no_bad_month").status).toBe("watch");
  });
});

describe("edge cases", () => {
  it("does not divide by a zero balance", () => {
    const months = periodMonths({ ...cfg, startingBalance: 0 }, [t("2026-11-04", 5)], "2026-11-20");
    expect(months[0].returnPct).toBe(0);
  });
});
