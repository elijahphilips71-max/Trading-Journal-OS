"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireOnboarded } from "@/lib/data";

export type ShareResult = { ok: true } | { ok: false; error: string };

/** Turn the link on/off and choose what Dad can see. */
export async function updateShare(input: { enabled?: boolean; show_notes?: boolean; show_ai?: boolean }): Promise<ShareResult> {
  const patch: Record<string, boolean> = {};
  for (const k of ["enabled", "show_notes", "show_ai"] as const) if (typeof input[k] === "boolean") patch[k] = input[k];
  if (!Object.keys(patch).length) return { ok: true };
  const { supabase, userId } = await requireOnboarded();
  const { error } = await supabase.from("share_links").update(patch).eq("user_id", userId);
  if (error) return { ok: false, error: "Couldn't save that. Try again." };
  revalidatePath("/dad");
  return { ok: true };
}

/** Make a brand new link. The old one stops working straight away. */
export async function regenerateShareLink(): Promise<ShareResult> {
  const { supabase, userId } = await requireOnboarded();
  const { error } = await supabase.from("share_links").update({ token: randomBytes(32).toString("hex") }).eq("user_id", userId);
  if (error) return { ok: false, error: "Couldn't make a new link. Try again." };
  revalidatePath("/dad");
  return { ok: true };
}
