"use server";

import { revalidatePath } from "next/cache";
import { requireOnboarded } from "@/lib/data";
import { biasVerdict, type Trend, type Zone } from "@/lib/playbook";

export type PbResult = { ok: true; id?: string } | { ok: false; error: string };

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export async function savePlan(input: {
  date: string;
  trend: Trend | null;
  zone: Zone | null;
  oldHigh: number | null;
  oldLow: number | null;
  notes: string;
}): Promise<PbResult> {
  if (!DAY.test(input.date)) return { ok: false, error: "Pick a day." };
  const trend = ["up", "sideways", "down"].includes(input.trend ?? "") ? input.trend : null;
  const zone = ["discount", "premium"].includes(input.zone ?? "") ? input.zone : null;
  const num = (n: number | null) => (n != null && Number.isFinite(n) && n > 0 ? n : null);
  const { supabase, userId } = await requireOnboarded();
  const verdict = biasVerdict(trend, zone, num(input.oldLow));
  const { error } = await supabase.from("daily_plans").upsert(
    {
      user_id: userId,
      date: input.date,
      spy_trend: trend,
      range_zone: zone,
      old_high: num(input.oldHigh),
      old_low: num(input.oldLow),
      verdict: verdict?.key ?? null,
      notes: input.notes.trim().slice(0, 2000) || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,date" },
  );
  if (error) return { ok: false, error: "Couldn't save your plan. Try again." };
  revalidatePath("/playbook");
  return { ok: true };
}

export type SetupInput = {
  id?: string;
  name: string;
  one_liner: string;
  checklist: string[];
  entry_rule: string;
  stop_rule: string;
  target_rule: string;
  avoid: string;
};

const clip = (s: string, n = 600) => s.trim().slice(0, n) || null;

export async function saveSetup(input: SetupInput): Promise<PbResult> {
  const name = input.name.trim().slice(0, 60);
  if (!name) return { ok: false, error: "Give the setup a name." };
  const { supabase } = await requireOnboarded();
  const row = {
    name,
    one_liner: clip(input.one_liner),
    checklist: input.checklist.map((c) => c.trim().slice(0, 300)).filter(Boolean).slice(0, 12),
    entry_rule: clip(input.entry_rule),
    stop_rule: clip(input.stop_rule),
    target_rule: clip(input.target_rule),
    avoid: clip(input.avoid),
  };
  if (input.id) {
    const { error } = await supabase.from("setups").update(row).eq("id", input.id);
    if (error) return { ok: false, error: "Couldn't save the setup." };
    revalidatePath("/playbook");
    return { ok: true, id: input.id };
  }
  const { count } = await supabase.from("setups").select("id", { count: "exact", head: true });
  const { data, error } = await supabase
    .from("setups")
    .insert({ ...row, sort: (count ?? 0) + 1 })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "Couldn't add the setup." };
  revalidatePath("/playbook");
  revalidatePath("/log");
  return { ok: true, id: data.id };
}

export async function deleteSetup(id: string): Promise<PbResult> {
  const { supabase } = await requireOnboarded();
  const { data } = await supabase.from("setups").select("example_image_path").eq("id", id).maybeSingle();
  if (data?.example_image_path) await supabase.storage.from("screenshots").remove([data.example_image_path]);
  // Trades keep their history; their setup just becomes "No setup".
  const { error } = await supabase.from("setups").delete().eq("id", id);
  if (error) return { ok: false, error: "Couldn't delete the setup." };
  revalidatePath("/playbook");
  return { ok: true };
}

/** Attach (or clear) the example screenshot the browser uploaded for a setup. */
export async function setSetupImage(id: string, path: string | null): Promise<PbResult> {
  const { supabase, userId } = await requireOnboarded();
  if (path && (!path.startsWith(`${userId}/setups/${id}/`) || path.includes(".."))) {
    return { ok: false, error: "That upload doesn't belong to this setup." };
  }
  const { data: old } = await supabase.from("setups").select("example_image_path").eq("id", id).maybeSingle();
  const { error } = await supabase.from("setups").update({ example_image_path: path }).eq("id", id);
  if (error) return { ok: false, error: "Couldn't save the picture." };
  if (old?.example_image_path && old.example_image_path !== path) {
    await supabase.storage.from("screenshots").remove([old.example_image_path]);
  }
  revalidatePath("/playbook");
  return { ok: true };
}

/** Replace the active rule list. Old trades keep the rule text they were logged with. */
export async function saveRuleList(rules: { id?: string; text: string }[]): Promise<PbResult> {
  const clean = rules.map((r) => ({ ...r, text: r.text.trim().slice(0, 200) })).filter((r) => r.text);
  if (clean.length === 0) return { ok: false, error: "Keep at least one rule." };
  if (clean.length > 10) return { ok: false, error: "10 rules at most. Keep it simple." };
  const { supabase } = await requireOnboarded();
  const { data: existing } = await supabase.from("rules").select("id").eq("active", true);
  const keep = new Set(clean.filter((r) => r.id).map((r) => r.id));
  const retire = (existing ?? []).map((r) => r.id).filter((id) => !keep.has(id));
  if (retire.length) await supabase.from("rules").update({ active: false }).in("id", retire);
  for (const [i, r] of clean.entries()) {
    const res = r.id
      ? await supabase.from("rules").update({ text: r.text, sort: i + 1 }).eq("id", r.id)
      : await supabase.from("rules").insert({ text: r.text, sort: i + 1 });
    if (res.error) return { ok: false, error: "Couldn't save your rules." };
  }
  revalidatePath("/playbook");
  revalidatePath("/log");
  return { ok: true };
}
