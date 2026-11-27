"use client";

import { useEffect } from "react";

/** Registers the service worker (production only, so local development isn't cached). */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // The app still works without it.
    });
  }, []);
  return null;
}
