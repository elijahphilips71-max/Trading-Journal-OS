"use client";

import { useActionState } from "react";
import { saveSettings } from "@/app/actions/profile";
import { ProfileFields } from "@/components/ProfileFields";
import type { Profile } from "@/lib/types";

export function SettingsForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(saveSettings, {});
  return (
    <form action={action} className="card" style={{ gap: 16 }}>
      <span className="h2">My paper account</span>
      <ProfileFields profile={profile} />
      {state.error && <div className="notice bad" role="alert">{state.error}</div>}
      {state.saved && <div className="notice ok" role="status">Saved.</div>}
      <button className="btn pri" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
    </form>
  );
}
