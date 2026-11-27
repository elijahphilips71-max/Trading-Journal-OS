"use client";

import { useActionState } from "react";
import { saveOnboarding } from "@/app/actions/profile";
import { ProfileFields } from "@/components/ProfileFields";
import type { Profile } from "@/lib/types";

export function OnboardingForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(saveOnboarding, {});
  return (
    <form action={action} className="card" style={{ gap: 16 }}>
      <ProfileFields profile={profile} />
      {state.error && <div className="notice bad" role="alert">{state.error}</div>}
      <button className="btn pri" disabled={pending}>{pending ? "Saving…" : "Start my journal"}</button>
    </form>
  );
}
