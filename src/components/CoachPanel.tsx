"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { generateReview, sendCoachMessage } from "@/app/actions/coach";
import type { AiMessage, AiReview } from "@/lib/journal";
import { gradeClass } from "@/lib/format";
import { SparkIcon } from "./icons";

type ReviewProps = { tradeId: string; closed: boolean; aiOn: boolean; review: AiReview | null };

/** The coach's grade for a closed trade. Asks for one automatically the first time. */
export function CoachReview({ tradeId, closed, aiOn, review }: ReviewProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const asked = useRef(false);

  function run(again: boolean) {
    setError("");
    start(async () => {
      const res = await generateReview(tradeId, again);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  useEffect(() => {
    if (closed && aiOn && !review && !asked.current) {
      asked.current = true;
      run(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when a closed trade has no review
  }, [closed, aiOn, review]);

  return (
    <div className="card ai">
      <div className="row">
        <div className="flex items-center gap-2">
          <SparkIcon size={18} style={{ color: "var(--accent-soft)" }} />
          <span className="font-bold" style={{ color: "var(--accent-soft)" }}>AI coach review</span>
        </div>
        {review?.grade && (
          <span className={`pill ${gradeClass(review.grade)}`} style={{ fontSize: 15, padding: "5px 12px" }} aria-label={`Grade ${review.grade}`}>
            {review.grade}
          </span>
        )}
      </div>

      {!aiOn ? (
        <span className="muted" style={{ lineHeight: 1.5 }}>
          The coach switches on once an AI key is added to the app&apos;s settings (ANTHROPIC_API_KEY).
        </span>
      ) : !closed ? (
        <span className="muted" style={{ lineHeight: 1.5 }}>
          The coach grades your process once you close this trade. You can still ask it questions below.
        </span>
      ) : pending && !review ? (
        <span className="muted">The coach is reviewing your trade…</span>
      ) : review ? (
        <>
          <div className="flex flex-col gap-1">
            <span className="lbl">What went well</span>
            <span style={{ lineHeight: 1.5 }}>{review.went_well}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="lbl">Fix next time</span>
            <span style={{ lineHeight: 1.5 }}>{review.fix_next}</span>
          </div>
          <button className="btn sec sm self-start" disabled={pending} onClick={() => run(true)}>
            {pending ? "Re-checking…" : "Review again"}
          </button>
        </>
      ) : (
        <button className="btn sec sm self-start" disabled={pending} onClick={() => run(false)}>
          Get the coach&apos;s review
        </button>
      )}
      {error && <div className="notice bad" role="alert">{error}</div>}
      <span className="muted text-[11px]">The coach looks at your process. It never tells you what to buy or sell.</span>
    </div>
  );
}

type ChatProps = { tradeId: string | null; aiOn: boolean; messages: AiMessage[]; placeholder?: string; suggestions?: string[] };

/** "Ask the coach" chat, about one trade or about your trading overall. */
export function CoachChat({ tradeId, aiOn, messages, placeholder, suggestions = [] }: ChatProps) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [local, setLocal] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const shown = [...messages, ...local];

  function send(q: string) {
    if (!q.trim() || pending) return;
    setError("");
    setLocal([{ role: "user", content: q }]);
    setText("");
    start(async () => {
      const res = await sendCoachMessage(tradeId, q);
      if (!res.ok) {
        setLocal([]);
        setText(q);
        return setError(res.error);
      }
      setLocal([]);
      router.refresh();
    });
  }

  if (!aiOn) return null;

  return (
    <div className="card">
      <span className="h2">{tradeId ? "Ask the coach about this trade" : "Ask the coach"}</span>
      {shown.length > 0 && (
        <div className="flex flex-col gap-2.5" aria-live="polite">
          {shown.map((m, i) => (
            <div
              key={"id" in m ? (m as AiMessage).id : `l${i}`}
              className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[14px] ${
                m.role === "user" ? "self-end bg-[#222B3D]" : "self-start border border-[#2B3A63] bg-[#141C2E]"
              }`}
              style={{ lineHeight: 1.5 }}
            >
              {m.content}
            </div>
          ))}
          {pending && <span className="muted self-start text-[13px]">Coach is typing…</span>}
        </div>
      )}
      {shown.length === 0 && suggestions.length > 0 && (
        <div className="chips">
          {suggestions.map((s) => (
            <button key={s} type="button" className="chip" onClick={() => send(s)} disabled={pending}>
              {s}
            </button>
          ))}
        </div>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <div className="field">
          <label htmlFor={`ask-${tradeId ?? "month"}`} className="sr-only">
            Your question
          </label>
          <input
            id={`ask-${tradeId ?? "month"}`}
            style={{ fontFamily: "var(--font-inter)", fontSize: 15 }}
            placeholder={placeholder ?? "Ask a question…"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1500}
          />
        </div>
        <button className="btn pri" disabled={pending || !text.trim()}>
          Send
        </button>
      </form>
      {error && <div className="notice bad" role="alert">{error}</div>}
    </div>
  );
}
