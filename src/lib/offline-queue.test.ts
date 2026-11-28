import { describe, expect, it } from "vitest";
import type { TradeInput } from "@/app/actions/trades";
import { queueTrade, readQueue, updateQueued } from "./offline-queue";

function mem() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

const input = { ticker: "SPY", direction: "long", entry: 680, stop: 675, target: 690, riskPct: 1, setupId: null, emotion: null, notes: "", rules: [], openedDay: "2026-11-27" } as TradeInput;

describe("offline queue", () => {
  it("queues, updates and removes trades", () => {
    const s = mem();
    const a = queueTrade(input, new Date("2026-11-27T10:00:00Z"), s);
    queueTrade({ ...input, ticker: "QQQ" }, new Date(), s);
    expect(a.ref).toMatch(/^offline:[0-9a-f-]{36}$/);
    expect(readQueue(s).map((q) => q.input.ticker)).toEqual(["SPY", "QQQ"]);
    updateQueued(a.ref, { error: "Stop too wide" }, s);
    expect(readQueue(s)[0].error).toBe("Stop too wide");
    updateQueued(a.ref, null, s);
    expect(readQueue(s).map((q) => q.input.ticker)).toEqual(["QQQ"]);
  });

  it("survives junk in storage", () => {
    const s = mem();
    s.setItem("osj.offline-trades.v1", "{not json");
    expect(readQueue(s)).toEqual([]);
  });
});
