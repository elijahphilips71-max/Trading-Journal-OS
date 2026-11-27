"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { savePlan } from "@/app/actions/playbook";
import { biasVerdict, type Trend, type Zone } from "@/lib/playbook";

type Props = {
  day: string;
  dayLabel: string;
  initial: { trend: Trend | null; zone: Zone | null; oldHigh: number | null; oldLow: number | null; notes: string } | null;
  savedAt: string | null;
};

const TRENDS: [Trend, string][] = [
  ["up", "Up"],
  ["sideways", "Sideways"],
  ["down", "Down"],
];
const ZONES: [Zone, string][] = [
  ["discount", "Discount (bottom half)"],
  ["premium", "Premium (top half)"],
];

const TONE = {
  ok: { color: "var(--gain)", bg: "#0F2119", border: "#1D5A41" },
  warn: { color: "var(--warning)", bg: "#1E1A10", border: "#5A4718" },
  bad: { color: "var(--loss)", bg: "#22121A", border: "#5C2629" },
};

function toNum(s: string) {
  const n = Number(s.replace(/[$,\s]/g, ""));
  return s.trim() && Number.isFinite(n) && n > 0 ? n : null;
}

/** Step 1: read the daily chart, get one plain answer, save it as the day's plan. */
export function BiasForm({ day, dayLabel, initial, savedAt }: Props) {
  const router = useRouter();
  const [trend, setTrend] = useState<Trend | null>(initial?.trend ?? null);
  const [zone, setZone] = useState<Zone | null>(initial?.zone ?? null);
  const [high, setHigh] = useState(initial?.oldHigh?.toString() ?? "");
  const [low, setLow] = useState(initial?.oldLow?.toString() ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const verdict = biasVerdict(trend, zone, toNum(low));

  function save() {
    setMsg(null);
    start(async () => {
      const res = await savePlan({ date: day, trend, zone, oldHigh: toNum(high), oldLow: toNum(low), notes });
      if (!res.ok) return setMsg({ ok: false, text: res.error });
      setMsg({ ok: true, text: `Saved as your plan for ${dayLabel}.` });
      router.refresh();
    });
  }

  return (
    <div className="card">
      <div className="row">
        <span className="font-bold">Your plan for {dayLabel}</span>
        {savedAt && <span className="pill ok">Saved</span>}
      </div>

      <div className="flex flex-col gap-2">
        <span className="lbl">SPY daily trend</span>
        <div className="chips" role="group" aria-label="SPY daily trend">
          {TRENDS.map(([k, label]) => (
            <button key={k} type="button" className={`chip ${trend === k ? "on" : ""}`} aria-pressed={trend === k} onClick={() => setTrend(k)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="lbl">Where is price in its range?</span>
        <div className="chips" role="group" aria-label="Range position">
          {ZONES.map(([k, label]) => (
            <button key={k} type="button" className={`chip ${zone === k ? "on" : ""}`} aria-pressed={zone === k} onClick={() => setZone(k)}>
              {label}
            </button>
          ))}
        </div>
        <span className="muted text-[12px]" style={{ lineHeight: 1.5 }}>
          Take the last big swing high and low. Discount = bottom half of that range (cheap, good for buys). Premium = top half (expensive).
        </span>
      </div>

      <div className="grid2">
        <div className="field">
          <label htmlFor="old-high">Old high ($)</label>
          <input id="old-high" inputMode="decimal" placeholder="688.20" value={high} onChange={(e) => setHigh(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="old-low">Old low ($)</label>
          <input id="old-low" inputMode="decimal" placeholder="671.40" value={low} onChange={(e) => setLow(e.target.value)} />
        </div>
      </div>
      <span className="muted text-[12px]" style={{ lineHeight: 1.5 }}>
        Old highs and lows are where stop orders pile up (liquidity). Price often grabs them before turning.
      </span>

      {verdict ? (
        <div
          role="status"
          style={{
            border: `1px solid ${TONE[verdict.tone].border}`,
            background: TONE[verdict.tone].bg,
            borderRadius: 14,
            padding: 14,
          }}
        >
          <div className="font-bold" style={{ color: TONE[verdict.tone].color, fontSize: 17 }}>
            {verdict.title}
          </div>
          <div className="muted mt-1" style={{ lineHeight: 1.5 }}>
            {verdict.why}
          </div>
        </div>
      ) : (
        <div className="notice warn">Pick the trend and the range position to get today&apos;s answer.</div>
      )}

      <div className="field">
        <label htmlFor="plan-notes">Notes (optional)</label>
        <textarea id="plan-notes" placeholder="Anything you noticed on the chart" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <button className="btn pri" onClick={save} disabled={pending}>
        {pending ? "Saving…" : savedAt ? "Update my plan" : "Save as my plan"}
      </button>
      {msg && (
        <div className={`notice ${msg.ok ? "ok" : "bad"}`} role={msg.ok ? "status" : "alert"}>
          {msg.text}
        </div>
      )}
    </div>
  );
}
