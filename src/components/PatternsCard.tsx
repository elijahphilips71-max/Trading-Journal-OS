"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { generatePatterns } from "@/app/actions/coach";
import { shortDate } from "@/lib/format";
import { SparkIcon } from "./icons";

type Props = {
  period: string;
  label: string;
  aiOn: boolean;
  enough: boolean;
  bullets: { title: string; detail: string }[] | null;
  updated: string | null;
};

/** AI "Patterns this month" bullets, made on request and saved. */
export function PatternsCard({ period, label, aiOn, enough, bullets, updated }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function run() {
    setError("");
    start(async () => {
      const res = await generatePatterns(period);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  return (
    <div className="card ai">
      <div className="row">
        <div className="flex items-center gap-2">
          <SparkIcon size={18} style={{ color: "var(--accent-soft)" }} />
          <span className="font-bold" style={{ color: "var(--accent-soft)" }}>{label}</span>
        </div>
        {updated && <span className="muted text-[11px]">updated {shortDate(updated)}</span>}
      </div>
      {bullets?.length ? (
        <div className="flex flex-col gap-3" style={{ lineHeight: 1.5 }}>
          {bullets.map((b, i) => (
            <div key={i}>
              <b>{b.title}.</b> <span className="muted">{b.detail}</span>
            </div>
          ))}
        </div>
      ) : (
        <span className="muted" style={{ lineHeight: 1.5 }}>
          {!aiOn
            ? "Pattern spotting switches on once the AI key is added."
            : !enough
              ? "Close at least 3 trades in this range and the coach can look for patterns."
              : "Ask the coach to look across these trades for what's working and what isn't."}
        </span>
      )}
      {aiOn && enough && (
        <button className="btn sec sm self-start" onClick={run} disabled={pending}>
          {pending ? "Looking…" : bullets?.length ? "Look again" : "Spot my patterns"}
        </button>
      )}
      {error && <div className="notice bad" role="alert">{error}</div>}
    </div>
  );
}
