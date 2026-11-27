"use client";

import { useCallback, useMemo, useState } from "react";
import { shrinkImage } from "@/lib/images";
import { usd } from "@/lib/format";
import { CheckIcon } from "./icons";
import { ImageDrop } from "./ImageDrop";
import { TradeForm, type TradeFormProps } from "./TradeForm";

type Extracted = {
  ticker: string | null;
  direction: "long" | "short" | null;
  entry: number | null;
  stop: number | null;
  target: number | null;
  confidence: "high" | "medium" | "low";
  note: string;
};

type State =
  | { kind: "idle" }
  | { kind: "reading"; file: File }
  | { kind: "found"; file: File; data: Extracted }
  | { kind: "filled"; file: File; data: Extracted }
  | { kind: "error"; file: File | null; message: string };

/** Upload a TradingView screenshot, let the AI read the plan, confirm, then fill Quick add. */
export function ScreenshotAutofill({ formProps, aiOn }: { formProps: Omit<TradeFormProps, "mode">; aiOn: boolean }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const preview = useMemo(() => ("file" in state && state.file ? URL.createObjectURL(state.file) : null), [state]);

  const onImage = useCallback(async (file: File) => {
    setState({ kind: "reading", file });
    try {
      const small = await shrinkImage(file, 1600, 0.9);
      const body = new FormData();
      body.append("image", small, "chart");
      const res = await fetch("/api/extract", { method: "POST", body });
      const json = (await res.json().catch(() => ({}))) as { data?: Extracted; error?: string };
      if (!res.ok || !json.data) throw new Error(json.error ?? "Couldn't read that screenshot.");
      setState({ kind: "found", file, data: json.data });
    } catch (e) {
      setState({ kind: "error", file, message: e instanceof Error ? e.message : "Something went wrong." });
    }
  }, []);

  if (state.kind === "filled") {
    const d = state.data;
    return (
      <TradeForm
        {...formProps}
        mode="new"
        initialFile={state.file}
        prefill={{
          ticker: d.ticker ?? undefined,
          direction: d.direction ?? undefined,
          entry: d.entry ?? undefined,
          stop: d.stop ?? undefined,
          target: d.target ?? undefined,
        }}
        prefillNote="Filled from your screenshot. Check the numbers, then save."
      />
    );
  }

  const found =
    state.kind === "found"
      ? [
          ["Ticker", state.data.ticker],
          ["Direction", state.data.direction === "long" ? "Long (buy)" : state.data.direction === "short" ? "Short (sell)" : null],
          ["Entry", state.data.entry != null ? usd(state.data.entry) : null],
          ["Stop", state.data.stop != null ? usd(state.data.stop) : null],
          ["Target", state.data.target != null ? usd(state.data.target) : null],
        ]
      : [];
  const count = found.filter(([, v]) => v != null).length;

  return (
    <div className="card">
      <span className="h2">Auto-fill from a TradingView chart</span>
      <span className="muted" style={{ lineHeight: 1.5 }}>
        Take a screenshot of your chart with the Long/Short position tool on it. The app reads the ticker, entry, stop and target for you.
      </span>

      {!aiOn && <div className="notice warn">Auto-fill needs the AI key (ANTHROPIC_API_KEY). Use Quick add for now.</div>}

      {preview && (
        // eslint-disable-next-line @next/next/no-img-element -- local preview
        <img src={preview} alt="Your chart screenshot" className="w-full rounded-xl border border-[var(--border)]" />
      )}

      {(state.kind === "idle" || state.kind === "error") && aiOn && (
        <ImageDrop onImage={onImage} title={state.kind === "error" ? "Try another screenshot" : "Choose a screenshot"} />
      )}

      {state.kind === "reading" && (
        <div className="notice ok" role="status">
          Reading your chart…
        </div>
      )}

      {state.kind === "error" && (
        <div className="notice bad" role="alert">
          {state.message}
        </div>
      )}

      {state.kind === "found" && (
        <>
          <div className="row">
            <span className="font-semibold">
              Found {count} thing{count === 1 ? "" : "s"}
            </span>
            <span className={`pill ${state.data.confidence === "high" ? "ok" : state.data.confidence === "medium" ? "warn" : "bad"}`}>
              {state.data.confidence === "high" ? "Clear read" : state.data.confidence === "medium" ? "Fairly sure" : "Not sure"}
            </span>
          </div>
          <div className="flex flex-col">
            {found.map(([label, value]) => (
              <div key={label} className="row" style={{ padding: "8px 0", borderTop: "1px solid #1E2635" }}>
                <span className="muted">{label}</span>
                {value != null ? (
                  <span className="num flex items-center gap-1.5">
                    <CheckIcon size={14} style={{ color: "var(--gain)" }} /> {value}
                  </span>
                ) : (
                  <span className="muted text-[13px]">not found, type it in</span>
                )}
              </div>
            ))}
          </div>
          {state.data.note && <span className="muted text-[13px]">{state.data.note}</span>}
          <div className="grid2">
            <button className="btn sec" onClick={() => setState({ kind: "idle" })}>
              Different screenshot
            </button>
            <button className="btn pri" onClick={() => setState({ kind: "filled", file: state.file, data: state.data })}>
              Use these
            </button>
          </div>
        </>
      )}
    </div>
  );
}
