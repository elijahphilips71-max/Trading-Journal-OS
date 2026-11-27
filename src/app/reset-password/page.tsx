"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("Your password needs to be at least 8 characters.");
    if (password !== again) return setError("The two passwords don't match.");
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (error) {
      return setError(
        error.message.toLowerCase().includes("session")
          ? "This reset link has expired. Go back to log in and ask for a new one."
          : error.message,
      );
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col gap-5 px-6" style={{ paddingTop: 56 }}>
      <div className="flex flex-col items-center gap-2.5">
        <Logo size={80} />
        <span className="h2" style={{ fontSize: 22 }}>Choose a new password</span>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="field text">
          <label htmlFor="pw">New password</label>
          <input id="pw" type="password" autoComplete="new-password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="field text">
          <label htmlFor="pw2">Type it again</label>
          <input id="pw2" type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />
        </div>
        {error && <div className="notice bad" role="alert">{error}</div>}
        <button className="btn pri" disabled={busy}>{busy ? "Saving…" : "Save new password"}</button>
      </form>
    </main>
  );
}
