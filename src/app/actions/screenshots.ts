"use server";

import { revalidatePath } from "next/cache";
import { requireOnboarded } from "@/lib/data";

export type ShotResult = { ok: true } | { ok: false; error: string };

/** Record a screenshot that the browser has already uploaded to storage. */
export async function addScreenshot(tradeId: string, storagePath: string, kind: "entry" | "exit"): Promise<ShotResult> {
  const { supabase, userId } = await requireOnboarded();
  if (!storagePath.startsWith(`${userId}/${tradeId}/`) || storagePath.includes("..")) {
    return { ok: false, error: "That upload doesn't belong to this trade." };
  }
  const { error } = await supabase
    .from("trade_screenshots")
    .insert({ trade_id: tradeId, storage_path: storagePath, kind: kind === "exit" ? "exit" : "entry" });
  if (error) return { ok: false, error: "Couldn't attach the screenshot. Try again." };
  revalidatePath(`/trades/${tradeId}`);
  return { ok: true };
}

export async function deleteScreenshot(id: string): Promise<ShotResult> {
  const { supabase } = await requireOnboarded();
  const { data } = await supabase.from("trade_screenshots").select("trade_id, storage_path").eq("id", id).maybeSingle();
  if (!data) return { ok: false, error: "Screenshot not found." };
  await supabase.storage.from("screenshots").remove([data.storage_path]);
  await supabase.from("trade_screenshots").delete().eq("id", id);
  revalidatePath(`/trades/${data.trade_id}`);
  return { ok: true };
}
