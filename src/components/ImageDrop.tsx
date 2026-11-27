"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { imageFromPaste } from "@/lib/images";
import { CameraIcon } from "./icons";

type Props = {
  onImage: (file: File) => void;
  /** Listen for Ctrl+V anywhere on the page while this is on screen. */
  listenForPaste?: boolean;
  title?: string;
  hint?: ReactNode;
  disabled?: boolean;
};

/** Pick, drop or paste an image. */
export function ImageDrop({ onImage, listenForPaste = true, title = "Choose a screenshot", hint, disabled }: Props) {
  const inputId = useId();
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  useEffect(() => {
    if (!listenForPaste || disabled) return;
    const onPaste = (e: ClipboardEvent) => {
      const f = imageFromPaste(e);
      if (f) {
        e.preventDefault();
        onImage(f);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [listenForPaste, onImage, disabled]);

  return (
    <label
      htmlFor={inputId}
      className="drop cursor-pointer"
      style={over ? { borderColor: "var(--accent)", background: "#121a2c" } : undefined}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = Array.from(e.dataTransfer.files).find((x) => x.type.startsWith("image/"));
        if (f) onImage(f);
      }}
    >
      <CameraIcon size={34} style={{ color: "var(--accent)" }} />
      <b>{title}</b>
      <span className="muted text-xs">{hint ?? "or paste one (Ctrl + V on laptop)"}</span>
      <input
        ref={ref}
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImage(f);
          if (ref.current) ref.current.value = "";
        }}
      />
    </label>
  );
}
