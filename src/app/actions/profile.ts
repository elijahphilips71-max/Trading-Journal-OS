"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export type ProfileFormState = { error?: string; saved?: boolean };

function parseProfile(form: FormData) {
  const name = String(form.get("display_name") ?? "").trim();
  const balance = Number(form.get("starting_balance"));
  const start = String(form.get("start_date") ?? "");
  const risk = Number(form.get("risk_pct"));
  if (!name) return { error: "Please add your first name." };
  if (!Number.isFinite(balance) || balance <= 0) return { error: "Starting balance needs to be more than £0." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return { error: "Please pick a start date." };
  if (!Number.isFinite(risk) || risk <= 0 || risk > 5) return { error: "Risk per trade should be between 0.1% and 5%." };
  return { values: { display_name: name, starting_balance: balance, start_date: start, risk_pct: risk } };
}

export async function saveOnboarding(_: ProfileFormState, form: FormData): Promise<ProfileFormState> {
  const parsed = parseProfile(form);
  if ("error" in parsed) return { error: parsed.error };
  const { supabase, userId } = await requireProfile();
  const { error } = await supabase.from("profiles").update({ ...parsed.values, onboarded: true }).eq("id", userId);
  if (error) return { error: "Couldn't save. Check your connection and try again." };
  revalidatePath("/", "layout");
  redirect("/");
}

export async function saveSettings(_: ProfileFormState, form: FormData): Promise<ProfileFormState> {
  const parsed = parseProfile(form);
  if ("error" in parsed) return { error: parsed.error };
  const { supabase, userId } = await requireProfile();
  const { error } = await supabase.from("profiles").update(parsed.values).eq("id", userId);
  if (error) return { error: "Couldn't save. Check your connection and try again." };
  revalidatePath("/", "layout");
  return { saved: true };
}

export async function logOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
