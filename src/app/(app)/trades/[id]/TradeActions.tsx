"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { closeTradeAction, deleteTrade, reopenTrade } from "@/app/actions/trades";
import type { Direction } from "@/lib/types";

type CloseProps = {
  id: string;
  today: string;
  openedDay: string;
  direction: Direction;
  target: number | null;
  stop: number;
};

export function CloseTradeForm({ id, today, openedDay, direction, target, stop }: CloseProps) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [exit, setExit] = useState("");
  const [day, setDay] = useState(today);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  if (!show) {
    return (
      <button className="btn pri" onClick={() => setShow(true)}>
        Close trade
      </button>
    );
  }

  function submit() {
    setError("");
    const n = Number(exit.replace(/[$,\s]/g, ""));
    start(async () => {
      const res = await closeTradeAction(id, n, day);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <span className="h2">Close trade</span>
      <span className="muted text-[13px]" style={{ lineHeight: 1.45 }}>
        Where did you {direction === "long" ? "sell" : "buy back"}? Tap a quick fill or type the price.
      </span>
      <div className="chips">
        {target != null && (
          <button type="button" className="chip" onClick={() => setExit(String(target))}>
            Hit target ${target}
          </button>
        )}
        <button type="button" className="chip" onClick={() => setExit(String(stop))}>
          Hit stop ${stop}
        </button>
      </div>
      <div className="flex gap-2.5">
        <div className="field">
          <label htmlFor="exit">Exit price $</label>
          <input id="exit" inputMode="decimal" autoFocus value={exit} onChange={(e) => setExit(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="cday">Closed on</label>
          <input id="cday" type="date" value={day} min={openedDay} max={today} onChange={(e) => setDay(e.target.value)} />
        </div>
      </div>
      {error && (
        <div className="notice bad" role="alert">
          {error}
        </div>
      )}
      <div className="grid2">
        <button type="button" className="btn sec" onClick={() => setShow(false)}>
          Cancel
        </button>
        <button className="btn pri" disabled={pending}>
          {pending ? "Saving…" : "Close it"}
        </button>
      </div>
    </form>
  );
}

/** Two taps to delete, so a slip of the thumb can't lose a trade. */
export function DeleteTradeButton({ id }: { id: string }) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <>
      <button
        className="btn danger"
        disabled={pending}
        onClick={() => {
          if (!armed) {
            setArmed(true);
            setTimeout(() => setArmed(false), 4000);
            return;
          }
          start(async () => {
            const res = await deleteTrade(id);
            if (!res.ok) return setError(res.error);
            router.push("/trades");
          });
        }}
      >
        {pending ? "Deleting…" : armed ? "Tap again to delete" : "Delete"}
      </button>
      {error && (
        <div className="notice bad col-span-2" role="alert">
          {error}
        </div>
      )}
    </>
  );
}

export function ReopenButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      className="btn sec sm self-center"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await reopenTrade(id);
          router.refresh();
        })
      }
    >
      Closed by mistake? Reopen it
    </button>
  );
}
