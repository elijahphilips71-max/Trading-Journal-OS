"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createTrade } from "@/app/actions/trades";
import { QUEUE_EVENT, looksOffline, readQueue, updateQueued, type QueuedTrade } from "@/lib/offline-queue";

/** Shows an offline banner and sends trades that were logged with no signal once the connection is back. */
export function OfflineSync() {
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState<QueuedTrade[]>([]);
  const [synced, setSynced] = useState(0);
  const running = useRef(false);

  const sync = useCallback(async () => {
    if (running.current || !navigator.onLine) return;
    running.current = true;
    let sent = 0;
    try {
      for (const q of readQueue()) {
        if (q.error) continue;
        try {
          const res = await createTrade({ ...q.input, clientRef: q.ref });
          if (res.ok) {
            updateQueued(q.ref, null);
            sent++;
          } else updateQueued(q.ref, { error: res.error });
        } catch (e) {
          if (looksOffline(e)) break;
          updateQueued(q.ref, { error: "Couldn't save this one." });
        }
      }
    } finally {
      running.current = false;
      setQueue(readQueue());
      if (sent) {
        setSynced(sent);
        router.refresh();
        setTimeout(() => setSynced(0), 5000);
      }
    }
  }, [router]);

  useEffect(() => {
    const refresh = () => {
      setOnline(navigator.onLine);
      setQueue(readQueue());
    };
    const back = () => {
      refresh();
      void sync();
    };
    refresh();
    void sync();
    window.addEventListener("online", back);
    window.addEventListener("offline", refresh);
    window.addEventListener(QUEUE_EVENT, refresh);
    return () => {
      window.removeEventListener("online", back);
      window.removeEventListener("offline", refresh);
      window.removeEventListener(QUEUE_EVENT, refresh);
    };
  }, [sync]);

  const waiting = queue.filter((q) => !q.error);
  const failed = queue.filter((q) => q.error);
  if (online && !queue.length && !synced) return null;

  return (
    <div className="flex flex-col gap-2 px-4 pt-3 lg:px-8" aria-live="polite">
      {!online && (
        <div className="notice warn">
          You&apos;re offline. You can still log trades: they&apos;ll wait on this device and save when you&apos;re back online.
        </div>
      )}
      {online && waiting.length > 0 && (
        <div className="notice warn">
          Saving {waiting.length} trade{waiting.length === 1 ? "" : "s"} you logged offline…
        </div>
      )}
      {!online && waiting.length > 0 && (
        <div className="notice">
          {waiting.length} trade{waiting.length === 1 ? " is" : "s are"} waiting to be saved.
        </div>
      )}
      {synced > 0 && (
        <div className="notice ok">
          {synced} offline trade{synced === 1 ? "" : "s"} saved to your journal.
        </div>
      )}
      {failed.map((q) => (
        <div key={q.ref} className="notice bad flex flex-col gap-2">
          <span>
            Your offline {q.input.ticker.toUpperCase()} trade couldn&apos;t be saved: {q.error}
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn sec sm"
              onClick={() => {
                updateQueued(q.ref, { error: undefined });
                void sync();
              }}
            >
              Try again
            </button>
            <button className="btn danger sm" onClick={() => updateQueued(q.ref, null)}>
              Discard it
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
