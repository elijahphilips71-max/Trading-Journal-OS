"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { addScreenshot, deleteScreenshot } from "@/app/actions/screenshots";
import { uploadScreenshot } from "@/lib/images";
import type { Screenshot } from "@/lib/journal";
import { ImageDrop } from "./ImageDrop";

type Props = { tradeId: string; userId: string; shots: Screenshot[]; closed: boolean };

export function ScreenshotGallery({ tradeId, userId, shots, closed }: Props) {
  const router = useRouter();
  const [kind, setKind] = useState<"entry" | "exit">(closed ? "exit" : "entry");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [big, setBig] = useState<string | null>(null);
  const [armed, setArmed] = useState<string | null>(null);

  const onImage = useCallback(
    async (file: File) => {
      setError("");
      setBusy(true);
      try {
        const path = await uploadScreenshot(userId, tradeId, file);
        const res = await addScreenshot(tradeId, path, kind);
        if (!res.ok) throw new Error(res.error);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed.");
      } finally {
        setBusy(false);
      }
    },
    [userId, tradeId, kind, router],
  );

  async function remove(id: string) {
    if (armed !== id) {
      setArmed(id);
      setTimeout(() => setArmed(null), 4000);
      return;
    }
    setBusy(true);
    const res = await deleteScreenshot(id);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.refresh();
  }

  return (
    <div className="card">
      <span className="h2">Chart</span>
      {shots.length > 0 && (
        <div className="flex flex-col gap-3">
          {shots.map((s) => (
            <figure key={s.id} className="m-0 flex flex-col gap-1.5">
              {s.url ? (
                <button type="button" className="block overflow-hidden rounded-xl border border-[var(--border)]" onClick={() => setBig(s.url)} aria-label="Open full size">
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed URL from private storage */}
                  <img src={s.url} alt={`${s.kind === "exit" ? "Exit" : "Entry"} chart screenshot`} className="block w-full" loading="lazy" />
                </button>
              ) : (
                <div className="muted text-[13px]">Couldn&apos;t load this image.</div>
              )}
              <figcaption className="row">
                <span className="pill neutral">{s.kind === "exit" ? "Exit" : "Entry"}</span>
                <button type="button" className="btn sec sm" onClick={() => remove(s.id)} disabled={busy}>
                  {armed === s.id ? "Tap again to remove" : "Remove"}
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      <div className="seg" role="group" aria-label="Screenshot type">
        <button type="button" className={kind === "entry" ? "on" : ""} onClick={() => setKind("entry")}>
          Entry chart
        </button>
        <button type="button" className={kind === "exit" ? "on" : ""} onClick={() => setKind("exit")}>
          Exit chart
        </button>
      </div>
      <ImageDrop
        onImage={onImage}
        disabled={busy}
        title={busy ? "Uploading…" : shots.length ? "Add another screenshot" : "Add a chart screenshot"}
      />
      {error && (
        <div className="notice bad" role="alert">
          {error}
        </div>
      )}

      {big && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Screenshot full size"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3"
          onClick={() => setBig(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={big} alt="Chart screenshot, full size" className="max-h-full max-w-full rounded-lg" />
          <button className="btn sec sm absolute right-3 top-3" onClick={() => setBig(null)}>
            Close
          </button>
        </div>
      )}
    </div>
  );
}
