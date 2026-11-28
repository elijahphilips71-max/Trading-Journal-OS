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

  let { data: profile, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle<Profile>();

  // Logged in but no profile row (e.g. the account was made before the database was set up).
  // Make one now instead of sending him to /login, which would bounce straight back here forever.
  if (!profile && !error) {
    const name = (claims?.claims?.user_metadata as { first_name?: string } | undefined)?.first_name?.trim();
    const made = await supabase.from("profiles").insert({ id: userId, display_name: name || null }).select("*").single<Profile>();
    if (!made.error) {
      await supabase.from("share_links").insert({ user_id: userId });
      profile = made.data;
    } else {
      error = made.error;
    }
  }
  if (!profile) redirect(`/auth/problem?code=${encodeURIComponent(error?.code ?? "no-profile")}`);

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
