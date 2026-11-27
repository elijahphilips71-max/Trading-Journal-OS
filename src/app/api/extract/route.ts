import { NextResponse } from "next/server";
import { CoachError, DAILY_LIMIT, aiConfigured, extractFromScreenshot } from "@/lib/ai/coach";
import { createClient } from "@/lib/supabase/server";

const TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
type ImageType = (typeof TYPES)[number];
const MAX_BYTES = 4 * 1024 * 1024;

/** POST a screenshot (form field "image"); get back the trade plan read from it. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  if (!aiConfigured()) return NextResponse.json({ error: "Auto-fill needs the AI key (ANTHROPIC_API_KEY) to be set." }, { status: 503 });

  // Same daily cap as the coach (counted from saved coach replies).
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const [a, b] = await Promise.all([
    supabase.from("ai_reviews").select("id", { count: "exact", head: true }).gte("created_at", since),
    supabase.from("ai_messages").select("id", { count: "exact", head: true }).eq("role", "assistant").gte("created_at", since),
  ]);
  if ((a.count ?? 0) + (b.count ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json({ error: "You've reached today's AI limit. Fill the form by hand for now." }, { status: 429 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof Blob)) return NextResponse.json({ error: "No image received." }, { status: 400 });
  if (!TYPES.includes(file.type as ImageType)) return NextResponse.json({ error: "Use a PNG, JPG or WebP screenshot." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "That image is too big." }, { status: 413 });

  try {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const data = await extractFromScreenshot(base64, file.type as ImageType);
    // Log it as a coach reply so it counts toward the daily cap.
    await supabase.from("ai_messages").insert([
      { trade_id: null, role: "user", content: "[[autofill]] screenshot" },
      { trade_id: null, role: "assistant", content: `[[autofill]] ${JSON.stringify(data)}` },
    ]);
    return NextResponse.json({ data });
  } catch (e) {
    const msg = e instanceof CoachError ? e.message : "Couldn't read that screenshot.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
