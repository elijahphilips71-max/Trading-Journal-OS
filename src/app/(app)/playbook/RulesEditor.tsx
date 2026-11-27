"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveRuleList } from "@/app/actions/playbook";
import type { Rule } from "@/lib/types";

/** Edit the rules you tick off on every trade. */
export function RulesEditor({ rules }: { rules: Rule[] }) {
  const router = useRouter();
  const [list, setList] = useState(rules.map((r) => ({ id: r.id as string | undefined, text: r.text, key: r.id })));
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  // After a save the server sends fresh rules with real ids; pick them up so a second save doesn't duplicate.
  const [seen, setSeen] = useState(rules);
  if (seen !== rules) {
    setSeen(rules);
    setList(rules.map((r) => ({ id: r.id, text: r.text, key: r.id })));
  }

  function move(i: number, by: number) {
    setList((l) => {
      const j = i + by;
      if (j < 0 || j >= l.length) return l;
      const next = [...l];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function save() {
    setMsg(null);
    start(async () => {
      const res = await saveRuleList(list.map(({ id, text }) => ({ id, text })));
      if (!res.ok) return setMsg({ ok: false, text: res.error });
      setMsg({ ok: true, text: "Rules saved. New trades use this list. Old trades keep the rules they were logged with." });
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <div className="card">
      <div className="row">
        <span className="font-bold">My rules</span>
        <span className="muted text-[12px]">Ticked on every trade</span>
      </div>

      {!editing ? (
        <>
          <ol className="flex list-decimal flex-col gap-1.5 pl-5" style={{ lineHeight: 1.5 }}>
            {rules.map((r) => (
              <li key={r.id}>{r.text}</li>
            ))}
          </ol>
          <button className="btn sec sm self-start" onClick={() => setEditing(true)}>
            Edit my rules
          </button>
        </>
      ) : (
        <>
          {list.map((r, i) => (
            <div key={r.key} className="flex items-center gap-1.5">
              <div className="field text">
                <input
                  aria-label={`Rule ${i + 1}`}
                  maxLength={200}
                  value={r.text}
                  onChange={(e) => setList((l) => l.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                />
              </div>
              <button type="button" className="icon-btn" aria-label={`Move rule ${i + 1} up`} onClick={() => move(i, -1)} disabled={i === 0}>
                ↑
              </button>
              <button type="button" className="icon-btn" aria-label={`Remove rule ${i + 1}`} onClick={() => setList((l) => l.filter((_, j) => j !== i))}>
                ×
              </button>
            </div>
          ))}
          {list.length < 10 && (
            <button
              type="button"
              className="btn sec sm self-start"
              onClick={() => setList((l) => [...l, { id: undefined, text: "", key: crypto.randomUUID() }])}
            >
              + Add a rule
            </button>
          )}
          <span className="muted text-[12px]">Keep it short: 3 to 7 rules you can check in a few seconds.</span>
          <div className="flex gap-2">
            <button className="btn pri" onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save rules"}
            </button>
            <button
              className="btn sec"
              onClick={() => {
                setList(rules.map((r) => ({ id: r.id, text: r.text, key: r.id })));
                setEditing(false);
              }}
              disabled={pending}
            >
              Cancel
            </button>
          </div>
        </>
      )}
      {msg && (
        <div className={`notice ${msg.ok ? "ok" : "bad"}`} role={msg.ok ? "status" : "alert"}>
          {msg.text}
        </div>
      )}
    </div>
  );
}
