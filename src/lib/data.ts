import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Profile } from "./types";

/** The logged-in user and their profile. Sends them to /login or /onboarding when needed. */
export const requireProfile = cache(async () => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single<Profile>();
  if (!profile) redirect("/login");

  // Numbers come back from Postgres as strings for numeric columns.
  const p: Profile = {
    ...profile,
    starting_balance: Number(profile.starting_balance),
    risk_pct: Number(profile.risk_pct),
    rules_threshold: Number(profile.rules_threshold),
  };
  return { supabase, userId, profile: p, email: (claims?.claims?.email as string | undefined) ?? "" };
});

export async function requireOnboarded() {
  const ctx = await requireProfile();
  if (!ctx.profile.onboarded) redirect("/onboarding");
  return ctx;
}
