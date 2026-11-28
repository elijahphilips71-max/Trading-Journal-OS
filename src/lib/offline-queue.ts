import type { TradeInput } from "@/app/actions/trades";

/** Trades logged with no signal wait here (in this browser) until they can be saved. */
export type QueuedTrade = { ref: string; input: TradeInput; queuedAt: string; error?: string };

const KEY = "osj.offline-trades.v1";
export const QUEUE_EVENT = "osj-queue-changed";

type Store = Pick<Storage, "getItem" | "setItem">;

function store(): Store | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readQueue(s: Store | null = store()): QueuedTrade[] {
  try {
    const raw = s?.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((q) => q && typeof q.ref === "string" && q.input) : [];
  } catch {
    return [];
  }
}

function write(list: QueuedTrade[], s: Store | null) {
  if (!s) throw new Error("This browser can't store trades offline.");
  s.setItem(KEY, JSON.stringify(list));
  if (typeof window !== "undefined") window.dispatchEvent(new Event(QUEUE_EVENT));
}

export function queueTrade(input: TradeInput, now = new Date(), s: Store | null = store()): QueuedTrade {
  const item: QueuedTrade = { ref: `offline:${crypto.randomUUID()}`, input: { ...input, clientRef: undefined }, queuedAt: now.toISOString() };
  write([...readQueue(s), item], s);
  return item;
}

export function updateQueued(ref: string, patch: Partial<QueuedTrade> | null, s: Store | null = store()) {
  const list = readQueue(s);
  write(patch === null ? list.filter((q) => q.ref !== ref) : list.map((q) => (q.ref === ref ? { ...q, ...patch } : q)), s);
}

/** A save that threw (rather than returning an error) means the network is down. */
export function looksOffline(e: unknown) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  return e instanceof TypeError || (e instanceof Error && /fetch|network|load failed/i.test(e.message));
}
