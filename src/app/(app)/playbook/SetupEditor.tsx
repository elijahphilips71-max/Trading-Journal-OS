"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { deleteSetup, saveSetup, setSetupImage, type SetupInput } from "@/app/actions/playbook";
import { ImageDrop } from "@/components/ImageDrop";
import { MAX_UPLOAD_BYTES, uploadScreenshot } from "@/lib/images";
import type { Setup } from "@/lib/types";

type Props = { userId: string; setup: Setup | null; hasImage?: boolean; onDone?: () => void };

const EMPTY: SetupInput = { name: "", one_liner: "", checklist: [""], entry_rule: "", stop_rule: "", target_rule: "", avoid: "" };

function fromSetup(s: Setup): SetupInput {
  return {
    id: s.id,
    name: s.name,
    one_liner: s.one_liner ?? "",
    checklist: s.checklist.length ? s.checklist : [""],
    entry_rule: s.entry_rule ?? "",
    stop_rule: s.stop_rule ?? "",
    target_rule: s.target_rule ?? "",
    avoid: s.avoid ?? "",
  };
}

/** Add or edit a setup. New setups go to the setup tab once saved. */
export function SetupEditor({ userId, setup, hasImage, onDone }: Props) {
  const router = useRouter();
  const [v, setV] = useState<SetupInput>(setup ? fromSetup(setup) : EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [pending, start] = useTransition();
  const set = (k: keyof SetupInput, val: string) => setV((o) => ({ ...o, [k]: val }));
  const setItem = (i: number, val: string) => setV((o) => ({ ...o, checklist: o.checklist.map((c, j) => (i === j ? val : c)) }));

  function save() {
    setError("");
    start(async () => {
      const res = await saveSetup(v);
      if (!res.ok) return setError(res.error);
      if (setup) {
        router.refresh();
        onDone?.();
      } else {
        router.push(`/playbook?tab=setup&s=${res.id}`);
      }
    });
  }

  function remove() {
    if (!setup) return;
    setError("");
    start(async () => {
      const res = await deleteSetup(setup.id);
      if (!res.ok) return setError(res.error);
      router.push("/playbook?tab=setup");
    });
  }

  const onImage = useCallback(
    async (file: File) => {
      if (!setup) return;
      if (file.size > MAX_UPLOAD_BYTES) return setError("That picture is too big. Keep it under 15 MB.");
      setError("");
      setBusy("Uploading…");
      try {
        const path = await uploadScreenshot(userId, `setups/${setup.id}`, file);
        const res = await setSetupImage(setup.id, path);
        if (!res.ok) setError(res.error);
        else router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed.");
      } finally {
        setBusy("");
      }
    },
    [setup, userId, router],
  );

  function clearImage() {
    if (!setup) return;
    start(async () => {
      const res = await setSetupImage(setup.id, null);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  return (
    <div className="card">
      <span className="font-bold">{setup ? `Edit ${setup.name}` : "Add my own setup"}</span>

      <div className="field text">
        <label htmlFor="su-name">Name</label>
        <input id="su-name" maxLength={60} placeholder="e.g. Sweep + FVG" value={v.name} onChange={(e) => set("name", e.target.value)} />
      </div>
      <div className="field text">
        <label htmlFor="su-one">In one line</label>
        <input id="su-one" placeholder="What happens, in plain words" value={v.one_liner} onChange={(e) => set("one_liner", e.target.value)} />
      </div>

      <div className="flex flex-col gap-2">
        <span className="lbl">What I look for</span>
        {v.checklist.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="field text">
              <input aria-label={`Checklist item ${i + 1}`} value={c} onChange={(e) => setItem(i, e.target.value)} />
            </div>
            <button
              type="button"
              className="icon-btn"
              aria-label={`Remove item ${i + 1}`}
              onClick={() => setV((o) => ({ ...o, checklist: o.checklist.filter((_, j) => j !== i) }))}
            >
              ×
            </button>
          </div>
        ))}
        {v.checklist.length < 12 && (
          <button type="button" className="btn sec sm self-start" onClick={() => setV((o) => ({ ...o, checklist: [...o.checklist, ""] }))}>
            + Add a step
          </button>
        )}
      </div>

      <div className="field">
        <label htmlFor="su-entry">Entry</label>
        <textarea id="su-entry" value={v.entry_rule} onChange={(e) => set("entry_rule", e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="su-stop">Stop</label>
        <textarea id="su-stop" value={v.stop_rule} onChange={(e) => set("stop_rule", e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="su-target">Target</label>
        <textarea id="su-target" value={v.target_rule} onChange={(e) => set("target_rule", e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="su-avoid">Skip it if</label>
        <textarea id="su-avoid" value={v.avoid} onChange={(e) => set("avoid", e.target.value)} />
      </div>

      {setup && (
        <div className="flex flex-col gap-2">
          <span className="lbl">Example picture</span>
          <ImageDrop
            onImage={onImage}
            disabled={!!busy}
            title={busy || (hasImage ? "Swap the example picture" : "Add your own example picture")}
            hint="A chart screenshot of a perfect version of this setup."
          />
          {hasImage && (
            <button type="button" className="btn sec sm self-start" onClick={clearImage} disabled={pending}>
              Remove my picture
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="notice bad" role="alert">
          {error}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button className="btn pri" onClick={save} disabled={pending || !!busy}>
          {pending ? "Saving…" : setup ? "Save changes" : "Add setup"}
        </button>
        {setup && onDone && (
          <button className="btn sec" onClick={onDone} disabled={pending}>
            Cancel
          </button>
        )}
        {setup && (
          <DeleteSetup onConfirm={remove} disabled={pending} />
        )}
      </div>
    </div>
  );
}

function DeleteSetup({ onConfirm, disabled }: { onConfirm: () => void; disabled: boolean }) {
  const [sure, setSure] = useState(false);
  if (!sure)
    return (
      <button className="btn danger" onClick={() => setSure(true)} disabled={disabled}>
        Delete setup
      </button>
    );
  return (
    <div className="notice warn flex w-full flex-col gap-2">
      <span>Delete this setup? Trades logged with it keep their history but show “No setup”.</span>
      <div className="flex gap-2">
        <button className="btn danger sm" onClick={onConfirm} disabled={disabled}>
          Yes, delete
        </button>
        <button className="btn sec sm" onClick={() => setSure(false)}>
          Keep it
        </button>
      </div>
    </div>
  );
}

/** Shows the setup card, or the editor when "Edit" is pressed. */
export function EditableSetup({ userId, setup, hasImage, children }: Props & { setup: Setup; children: React.ReactNode }) {
  const [editing, setEditing] = useState(false);
  if (editing) return <SetupEditor userId={userId} setup={setup} hasImage={hasImage} onDone={() => setEditing(false)} />;
  return (
    <div className="flex flex-col gap-2">
      {children}
      <button className="btn sec sm self-start" onClick={() => setEditing(true)}>
        Edit this setup
      </button>
    </div>
  );
}
