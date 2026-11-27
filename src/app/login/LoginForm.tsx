"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Logo } from "@/components/Logo";
import { MailIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/safe-next";

type Mode = "in" | "up" | "forgot";
type Msg = { kind: "ok" | "bad"; text: string } | null;

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
}

/** Turn Supabase's error messages into plain English. */
function friendly(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "That email and password don't match. Try again, or use “Forgot password?”.";
  if (m.includes("email not confirmed")) return "Please confirm your email first. Check your inbox for the link we sent.";
  if (m.includes("already registered")) return "There's already an account with that email. Try logging in instead.";
  if (m.includes("rate limit") || m.includes("security purposes"))
    return "Too many tries in a short time. Wait a minute, then try again.";
  if (m.includes("password")) return "Your password needs to be at least 8 characters.";
  return message;
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [mode, setMode] = useState<Mode>("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(
    params.get("error") === "link"
      ? { kind: "bad", text: "That link has expired or was already used. Ask for a new one below." }
      : null,
  );

  const callback = (to: string) => `${siteUrl()}/auth/callback?next=${encodeURIComponent(to)}`;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    const supabase = createClient();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return setMsg({ kind: "bad", text: friendly(error.message) });
        router.replace(next);
        router.refresh();
      } else if (mode === "up") {
        if (password.length < 8) return setMsg({ kind: "bad", text: "Your password needs to be at least 8 characters." });
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { first_name: name.trim() }, emailRedirectTo: callback("/onboarding") },
        });
        if (error) return setMsg({ kind: "bad", text: friendly(error.message) });
        if (data.session) {
          router.replace("/onboarding");
          router.refresh();
        } else {
          setMsg({ kind: "ok", text: `Nearly there. We've sent a link to ${email}. Tap it to confirm your account.` });
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: callback("/reset-password") });
        if (error) return setMsg({ kind: "bad", text: friendly(error.message) });
        setMsg({ kind: "ok", text: `If there's an account for ${email}, a reset link is on its way.` });
      }
    } finally {
      setBusy(false);
    }
  }

  async function magicLink() {
    setMsg(null);
    if (!email.includes("@")) return setMsg({ kind: "bad", text: "Type your email above first." });
    setBusy(true);
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callback(next), shouldCreateUser: mode === "up" },
    });
    setBusy(false);
    if (error) return setMsg({ kind: "bad", text: friendly(error.message) });
    setMsg({ kind: "ok", text: `Check your email. We've sent a login link to ${email}.` });
  }

  const cta = mode === "in" ? "Log in" : mode === "up" ? "Create my account" : "Send reset link";

  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col gap-[22px] px-6 pb-8"
      style={{ paddingTop: 56 }}
    >
      <div className="flex flex-col items-center gap-2.5">
        <Logo size={116} title="OS Journal logo" />
        <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em" }}>OS Journal</span>
        <span className="muted">Your road to a real account</span>
      </div>

      {mode !== "forgot" ? (
        <div className="seg" role="tablist">
          <button type="button" role="tab" aria-selected={mode === "in"} className={mode === "in" ? "on" : ""} onClick={() => setMode("in")}>
            Log in
          </button>
          <button type="button" role="tab" aria-selected={mode === "up"} className={mode === "up" ? "on" : ""} onClick={() => setMode("up")}>
            Create account
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <span className="h2">Reset your password</span>
          <span className="muted">We&apos;ll email you a link to choose a new one.</span>
        </div>
      )}

      <form onSubmit={submit} className="flex flex-col gap-[18px]">
        {mode === "up" && (
          <div className="field text">
            <label htmlFor="nm">First name</label>
            <input id="nm" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        )}
        <div className="field text">
          <label htmlFor="em">Email</label>
          <input
            id="em"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {mode !== "forgot" && (
          <div className="field text">
            <label htmlFor="pw">Password</label>
            <input
              id="pw"
              type="password"
              required
              minLength={8}
              autoComplete={mode === "in" ? "current-password" : "new-password"}
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        )}
        {mode === "in" && (
          <button type="button" className="self-end text-[13px] text-[var(--accent)]" style={{ marginTop: -8, minHeight: 32 }} onClick={() => setMode("forgot")}>
            Forgot password?
          </button>
        )}

        {msg && <div className={`notice ${msg.kind}`} role={msg.kind === "bad" ? "alert" : "status"}>{msg.text}</div>}

        <button className="btn pri" type="submit" disabled={busy} style={{ minHeight: 50 }}>
          {busy ? "One moment…" : cta}
        </button>
      </form>

      {mode === "forgot" ? (
        <button type="button" className="btn sec" onClick={() => setMode("in")}>
          Back to log in
        </button>
      ) : (
        <>
          <div className="flex items-center gap-3 text-xs" style={{ color: "#5B6478" }}>
            <span className="h-px flex-1 bg-[var(--border)]" />
            or
            <span className="h-px flex-1 bg-[var(--border)]" />
          </div>
          <button type="button" className="btn sec w-full" onClick={magicLink} disabled={busy}>
            <MailIcon size={18} />
            Email me a login link
          </button>
        </>
      )}

      <span className="muted mt-auto text-center text-xs" style={{ lineHeight: 1.5 }}>
        Your trades sync between your phone and laptop.
        <br />
        Dad&apos;s view link works without logging in.
      </span>
    </main>
  );
}
