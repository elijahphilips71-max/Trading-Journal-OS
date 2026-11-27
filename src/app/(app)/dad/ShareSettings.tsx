"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { regenerateShareLink, updateShare } from "@/app/actions/share";

type Props = { token: string; enabled: boolean; showNotes: boolean; showAi: boolean; serverReady: boolean };

function Switch({ on, label, onChange, disabled }: { on: boolean; label: string; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`switch ${on ? "on" : ""}`}
      onClick={() => onChange(!on)}
      disabled={disabled}
      style={{ margin: "8px 0" }}
    >
      <i />
    </button>
  );
}

/** Live link on/off, copy, new link, and what Dad can see. */
export function ShareSettings({ token, enabled, showNotes, showAi, serverReady }: Props) {
  const router = useRouter();
  const [state, setState] = useState({ enabled, show_notes: showNotes, show_ai: showAi });
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [sureNew, setSureNew] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  // eslint-disable-next-line react-hooks/set-state-in-effect -- the page address is only known in the browser
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}/r/${token}`;

  function change(k: keyof typeof state, v: boolean) {
    const prev = state;
    setState({ ...state, [k]: v });
    setError("");
    start(async () => {
      const res = await updateShare({ [k]: v });
      if (!res.ok) {
        setState(prev);
        setError(res.error);
      } else router.refresh();
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy. Press and hold the link to copy it instead.");
    }
  }

  function renew() {
    setError("");
    start(async () => {
      const res = await regenerateShareLink();
      if (!res.ok) return setError(res.error);
      setSureNew(false);
      router.refresh();
    });
  }

  return (
    <div className="card">
      <div className="row">
        <div className="flex flex-col gap-0.5">
          <span className="font-bold">Live link for Dad</span>
          <span className="muted text-[12px]">Read-only. Updates every time you log a trade.</span>
        </div>
        <Switch on={state.enabled} label="Turn Dad's link on or off" onChange={(v) => change("enabled", v)} disabled={pending} />
      </div>

      {state.enabled && (
        <>
          <div className="row rounded-xl border border-[var(--border)] bg-[var(--bg)] py-1.5 pr-1.5 pl-3">
            <span className="num muted min-w-0 overflow-hidden text-[12px] text-ellipsis whitespace-nowrap">{origin ? url : "…"}</span>
            <button className="btn pri sm flex-none" onClick={copy} disabled={!origin}>
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
          <div className="row">
            <span className="text-[13px]">Show my trade notes</span>
            <Switch on={state.show_notes} label="Show my latest trade note to Dad" onChange={(v) => change("show_notes", v)} disabled={pending} />
          </div>
          <div className="row">
            <span className="text-[13px]">Show AI coach summary</span>
            <Switch on={state.show_ai} label="Show the AI coach summary to Dad" onChange={(v) => change("show_ai", v)} disabled={pending} />
          </div>
          {!sureNew ? (
            <button className="btn sec sm self-start" onClick={() => setSureNew(true)} disabled={pending}>
              Make a new link
            </button>
          ) : (
            <div className="notice warn flex flex-col gap-2">
              <span>The old link stops working straight away. You&apos;ll need to send Dad the new one.</span>
              <div className="flex gap-2">
                <button className="btn pri sm" onClick={renew} disabled={pending}>
                  Yes, new link
                </button>
                <button className="btn sec sm" onClick={() => setSureNew(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
          {!serverReady && (
            <div className="notice warn" style={{ lineHeight: 1.5 }}>
              Dad&apos;s page isn&apos;t switched on yet on the server. Add <span className="num">SUPABASE_SERVICE_ROLE_KEY</span> in Vercel (Settings, Environment
              Variables) and redeploy. See docs/SETUP.md.
            </div>
          )}
        </>
      )}
      {error && (
        <div className="notice bad" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
