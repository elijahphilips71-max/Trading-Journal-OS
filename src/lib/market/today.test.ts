import { describe, expect, it } from "vitest";
import { eventsOn, jobsReportDay } from "./events";
import { ukClock, nyTime } from "./time";
import { dayTimeline, marketSession, tradeVerdict } from "./today";

describe("New York times in UK time", () => {
  it("handles both clocks", () => {
    expect(ukClock(nyTime("2026-11-30", "09:30"))).toBe("14:30"); // both on winter time
    expect(ukClock(nyTime("2026-06-15", "09:30"))).toBe("14:30"); // both on summer time
    expect(ukClock(nyTime("2026-03-16", "09:30"))).toBe("13:30"); // US changed, UK not yet
    expect(ukClock(nyTime("2026-10-26", "09:30"))).toBe("13:30"); // UK changed back, US not yet
  });
});

describe("market session", () => {
  it("knows holidays, weekends and half days", () => {
    expect(marketSession("2026-11-26").open).toBe(false);
    expect(marketSession("2026-11-28").open).toBe(false);
    const half = marketSession("2026-11-27");
    expect(half.open && ukClock(half.closeAt)).toBe("18:00");
    const normal = marketSession("2026-11-30");
    expect(normal.open && ukClock(normal.closeAt)).toBe("21:00");
  });
});

describe("news days", () => {
  it("finds the jobs report and Fed days", () => {
    expect(jobsReportDay("2026-12")).toBe("2026-12-04");
    expect(jobsReportDay("2026-07")).toBe("2026-07-02"); // 3 July is a market holiday
    expect(eventsOn("2026-12-09").map((e) => e.title)).toEqual(["Fed interest rate decision"]);
    expect(eventsOn("2026-12-08")).toEqual([]);
  });
});

describe("timeline and verdict", () => {
  it("reddens the window around the Fed", () => {
    const segs = dayTimeline("2026-12-09", eventsOn("2026-12-09"));
    const news = segs.find((s) => s.tone === "bad" && s.label.startsWith("Fed"));
    expect(news && `${ukClock(news.start)}-${ukClock(news.end)}`).toBe("18:45-19:30");
    for (let i = 1; i < segs.length; i++) expect(segs[i].start.getTime()).toBe(segs[i - 1].end.getTime());
  });

  it("gives one plain answer", () => {
    const base = { earningsSoon: [], bias: null, ukTime: ukClock };
    expect(tradeVerdict({ ...base, day: "2026-11-26", events: [] }).title).toBe("Sit out");
    expect(tradeVerdict({ ...base, day: "2026-12-04", events: eventsOn("2026-12-04") }).title).toBe("Wait until 15:00");
    expect(tradeVerdict({ ...base, day: "2026-12-09", events: eventsOn("2026-12-09") }).key).toBe("careful");
    expect(tradeVerdict({ ...base, day: "2026-12-01", events: [], earningsSoon: ["NVDA"] }).why).toContain("Skip NVDA");
    expect(tradeVerdict({ ...base, day: "2026-12-01", events: [] }).title).toBe("Trade day");
  });
});
