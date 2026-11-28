"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Friendly screen when a page fails to load. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  return (
    <main className="page">
      <div className="card">
        <span className="font-bold">{offline ? "You're offline" : "That didn't load"}</span>
        <span className="muted" style={{ lineHeight: 1.5 }}>
          {offline
            ? "Check your signal and try again. You can still log a trade: it'll save when you're back online."
            : "Something went wrong on our side. Your trades are safe. Try again, and if it keeps happening, come back in a few minutes."}
        </span>
        <div className="flex flex-wrap gap-2">
          <button className="btn pri" onClick={reset}>
            Try again
          </button>
          <Link className="btn sec" href="/">
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
