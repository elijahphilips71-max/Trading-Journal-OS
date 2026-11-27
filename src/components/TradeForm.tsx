"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { addScreenshot } from "@/app/actions/screenshots";
import { createTrade, updateTrade, type RuleTick, type TradeInput } from "@/app/actions/trades";
import { uploadScreenshot } from "@/lib/images";
import { gbp, shareCount, usd } from "@/lib/format";
import { closeTrade as calcClose, positionSize, round } from "@/lib/maths";
import { EMOTIONS, type Direction, type Rule, type Setup } from "@/lib/types";
import type { TradeWithRules } from "@/lib/journal";
import { CheckIcon } from "./icons";
import { ImageDrop } from "./ImageDrop";

export type TradeFormProps = {
  mode: "new" | "edit";
  balance: number;
  fx: number;
  fxLive: boolean;
  defaultRisk: number;
  rules: Rule[];
  setups: Setup[];
  tickers: string[];
  today: string;
  trade?: TradeWithRules;
  /** Values to pre-fill (e.g. from a screenshot). */
  prefill?: Partial<{ ticker: string; direction: Direction; entry: number; stop: number; target: number; setupId: string }>;
  prefillNote?: string;
  /** Needed to upload a screenshot with a new trade. */
  userId?: string;
  /** A screenshot to attach on save (e.g. the one used for auto-fill). */
  initialFile?: File | null;
};

const RISKS = [1, 1.5, 2];

function num(s: string): number {
  const n = Number(String(s).replace(/[$,£\s]/g, ""));
  return s.trim() === "" ? NaN : n;
}

function str(n: number | null | undefined) {
  return n == null ? "" : String(n);
}

export function TradeForm(p: TradeFormProps) {
  const router = useRouter();
  const t = p.trade;
  const init = p.prefill ?? {};
  const [ticker, setTicker] = useState(t?.ticker ?? init.ticker ?? "");
  const [direction, setDirection] = useState<Direction>(t?.direction ?? init.direction ?? "long");
  const [entry, setEntry] = useState(str(t?.entry ?? init.entry));
  const [stop, setStop] = useState(str(t?.stop ?? init.stop));
  const [target, setTarget] = useState(str(t?.target ?? init.target));
  const [risk, setRisk] = useState(t?.risk_pct ?? p.defaultRisk);
  const [sharesIn, setSharesIn] = useState(str(t?.shares));
  const [exit, setExit] = useState(str(t?.exit));
  const [setupId, setSetupId] = useState<string | null>(t?.setup_id ?? init.setupId ?? null);
  const [emotion, setEmotion] = useState<string | null>(t?.emotion ?? null);
  const [notes, setNotes] = useState(t?.notes ?? "");
  const [openedDay, setOpenedDay] = useState(t ? isoDay(t.opened_at) : p.today);
  const [closedDay, setClosedDay] = useState(t?.closed_at ? isoDay(t.closed_at) : p.today);
  const [ticks, setTicks] = useState<RuleTick[]>(() => {
    if (t && t.trade_rules.length) return t.trade_rules.map((r) => ({ rule_id: r.rule_id, rule_text: r.rule_text, followed: r.followed }));
    return p.rules.map((r) => ({ rule_id: r.id, rule_text: r.text, followed: false }));
  });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [file, setFile] = useState<File | null>(p.initialFile ?? null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const edit = p.mode === "edit";
  const closed = t?.status === "closed";

  const calc = useMemo(() => {
    if (!edit) {
      return positionSize({
        balanceGbp: p.balance,
        riskPct: risk,
        fx: p.fx,
        direction,
        entry: num(entry),
        stop: num(stop),
        target: target.trim() ? num(target) : null,
      });
    }
    return null;
  }, [edit, p.balance, p.fx, risk, direction, entry, stop, target]);

  const editCalc = useMemo(() => {
    if (!edit || !t) return null;
    const e = num(entry), s = num(stop), sh = num(sharesIn);
    if (!(e > 0 && s > 0 && sh > 0) || e === s) return null;
    const riskGbp = round((Math.abs(e - s) * sh) / t.fx_entry, 2);
    const res = closed && num(exit) > 0
      ? calcClose({ direction, entry: e, stop: s, exit: num(exit), shares: sh, fxEntry: t.fx_entry, fxExit: t.fx_exit })
      : null;
    return { riskGbp, res };
  }, [edit, t, entry, stop, sharesIn, exit, direction, closed]);

  const done = ticks.filter((r) => r.followed).length;

  function submit() {
    setError("");
    const input: TradeInput = {
      ticker,
      direction,
      entry: num(entry),
      stop: num(stop),
      target: target.trim() ? num(target) : null,
      riskPct: risk,
      setupId,
      emotion,
      notes,
      rules: ticks,
      openedDay,
      source: t?.source ?? (p.prefill ? "screenshot" : "quick"),
      shares: edit ? num(sharesIn) : null,
      exit: closed ? num(exit) : null,
      closedDay: closed ? closedDay : null,
    };
    if (!edit && calc && !calc.ok) return setError(calc.reason);
    start(async () => {
      const res = edit && t ? await updateTrade(t.id, input) : await createTrade(input);
      if (!res.ok) return setError(res.error);
      let q = "saved=1";
      if (!edit && file && p.userId) {
        try {
          const path = await uploadScreenshot(p.userId, res.id, file);
          const shot = await addScreenshot(res.id, path, "entry");
          if (!shot.ok) q = "saved=shotfail";
        } catch {
          q = "saved=shotfail";
        }
      }
      router.push(`/trades/${res.id}?${q}`);
    });
  }

  return (
    <form
      className="flex flex-col gap-3.5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {p.prefillNote && (
        <div className="notice ok flex items-center gap-2.5">
          <CheckIcon size={18} />
          {p.prefillNote}
        </div>
      )}

      <div className="card">
        <div className="field text">
          <label htmlFor="tk">Ticker</label>
          <input
            id="tk"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            autoComplete="off"
            autoCapitalize="characters"
            placeholder="e.g. SPY"
            style={{ fontFamily: "var(--font-jetbrains)" }}
          />
        </div>
        <div className="chips">
          {p.tickers.map((tk) => (
            <button type="button" key={tk} className={`chip ${ticker === tk ? "on" : ""}`} onClick={() => setTicker(tk)}>
              {tk}
            </button>
          ))}
        </div>
        <div className="seg">
          <button type="button" className={direction === "long" ? "on" : ""} onClick={() => setDirection("long")}>
            Long (buy)
          </button>
          <button type="button" className={direction === "short" ? "on" : ""} onClick={() => setDirection("short")}>
            Short (sell)
          </button>
        </div>
        <div className="flex gap-2.5">
          <Num id="en" label="Entry $" value={entry} onChange={setEntry} />
          <Num id="st" label="Stop $" value={stop} onChange={setStop} />
          <Num id="tp" label="Target $" value={target} onChange={setTarget} />
        </div>

        {!edit && (
          <div className="flex flex-col gap-2">
            <span className="lbl">Risk (share of your account you could lose)</span>
            <div className="chips">
              {RISKS.map((r) => (
                <button type="button" key={r} className={`chip ${risk === r ? "on" : ""}`} onClick={() => setRisk(r)}>
                  {r}% · {gbp((p.balance * r) / 100)}
                </button>
              ))}
            </div>
          </div>
        )}

        {edit && (
          <div className="flex gap-2.5">
            <Num id="sh" label="Shares" value={sharesIn} onChange={setSharesIn} />
            {closed && <Num id="ex" label="Exit $" value={exit} onChange={setExit} />}
          </div>
        )}

        {!edit && calc && (
          <div className="flex flex-col gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3" aria-live="polite">
            <div className="row">
              <span className="lbl">AUTO-CALCULATED</span>
              {calc.ok && calc.rewardRisk != null && (
                <span className={`pill ${calc.rewardRisk >= 2 ? "ok" : calc.rewardRisk >= 1 ? "warn" : "bad"}`}>
                  Reward {calc.rewardRisk.toFixed(1)}× risk
                </span>
              )}
            </div>
            {calc.ok ? (
              <>
                <div className="grid3">
                  <div className="kv">
                    <span>Buy this many</span>
                    <b>{shareCount(calc.shares)}</b>
                  </div>
                  <div className="kv">
                    <span>You risk</span>
                    <b>{gbp(calc.riskGbp)}</b>
                  </div>
                  <div className="kv">
                    <span>Could make</span>
                    <b className="up">{calc.rewardGbp == null ? "—" : gbp(calc.rewardGbp, { sign: true })}</b>
                  </div>
                </div>
                <span className="muted text-xs num">
                  Costs {usd(calc.positionUsd)} ({gbp(calc.positionGbp)}) at {p.fx.toFixed(4)} $/£
                  {p.fxLive ? "" : " (estimated rate)"}
                </span>
                {calc.tooBig && (
                  <div className="notice warn">Position is bigger than your account. Use a wider stop or a cheaper share.</div>
                )}
              </>
            ) : (
              <span className="muted text-[13px]">{calc.reason}</span>
            )}
          </div>
        )}

        {edit && editCalc && (
          <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
            <div className="grid3">
              <div className="kv">
                <span>You risked</span>
                <b>{gbp(editCalc.riskGbp)}</b>
              </div>
              {editCalc.res && (
                <>
                  <div className="kv">
                    <span>P&amp;L</span>
                    <b className={editCalc.res.pnlGbp >= 0 ? "up" : "dn"}>{gbp(editCalc.res.pnlGbp, { sign: true })}</b>
                  </div>
                  <div className="kv">
                    <span>R</span>
                    <b>{editCalc.res.r > 0 ? "+" : ""}{editCalc.res.r.toFixed(2)}R</b>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2.5">
          <div className="field">
            <label htmlFor="od">Opened on</label>
            <input id="od" type="date" value={openedDay} max={p.today} onChange={(e) => setOpenedDay(e.target.value)} />
          </div>
          {closed && (
            <div className="field">
              <label htmlFor="cd">Closed on</label>
              <input id="cd" type="date" value={closedDay} max={p.today} onChange={(e) => setClosedDay(e.target.value)} />
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="row">
          <span className="h2">Setup</span>
          <a className="btn sec sm" href="/playbook">See examples</a>
        </div>
        <div className="chips">
          {p.setups.map((s) => (
            <button type="button" key={s.id} className={`chip ${setupId === s.id ? "on" : ""}`} onClick={() => setSetupId(setupId === s.id ? null : s.id)}>
              {s.name}
            </button>
          ))}
          <button type="button" className={`chip ${setupId === null ? "on" : ""}`} onClick={() => setSetupId(null)}>
            No setup
          </button>
        </div>
      </div>

      <div className="card" style={{ gap: 4 }}>
        <div className="row" style={{ marginBottom: 6 }}>
          <span className="h2">My rules</span>
          <span className="num muted text-xs">
            {done}/{ticks.length}
          </span>
        </div>
        {ticks.map((r, i) => (
          <button
            type="button"
            key={r.rule_text}
            className="check"
            role="checkbox"
            aria-checked={r.followed}
            onClick={() => setTicks(ticks.map((x, j) => (j === i ? { ...x, followed: !x.followed } : x)))}
          >
            <span className={`box ${r.followed ? "on" : ""}`}>{r.followed && <CheckIcon />}</span>
            {r.rule_text}
          </button>
        ))}
        {ticks.length === 0 && <span className="muted">No rules yet. Add some in your Playbook.</span>}
      </div>

      <div className="card">
        <span className="h2">How do you feel?</span>
        <div className="chips">
          {EMOTIONS.map((e) => (
            <button type="button" key={e} className={`chip ${emotion === e ? "on" : ""}`} onClick={() => setEmotion(emotion === e ? null : e)}>
              {e}
            </button>
          ))}
        </div>
        <div className="field">
          <label htmlFor="nt">Notes (optional)</label>
          <textarea id="nt" placeholder="Why this trade? What's the plan?" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {!edit && p.userId && (
          preview ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
              <img src={preview} alt="Chart screenshot to attach" className="h-16 w-24 rounded-lg border border-[var(--border)] object-cover" />
              <span className="muted flex-1 text-[13px]">Screenshot will be saved with the trade.</span>
              <button type="button" className="btn sec sm" onClick={() => setFile(null)}>
                Remove
              </button>
            </div>
          ) : (
            <ImageDrop onImage={setFile} title="Attach chart screenshot" />
          )
        )}
      </div>

      {error && (
        <div className="notice bad" role="alert">
          {error}
        </div>
      )}
      <button className="btn pri" disabled={pending}>
        {pending ? "Saving…" : edit ? "Save changes" : "Save trade"}
      </button>
    </form>
  );
}

function Num({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} inputMode="decimal" autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function isoDay(at: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date(at));
}
