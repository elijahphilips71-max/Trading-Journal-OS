import { requireOnboarded } from "@/lib/data";
import { listSetups, listTrades } from "@/lib/journal";
import { HomeView } from "./HomeView";

export default async function HomePage() {
  const { supabase, profile } = await requireOnboarded();
  const [trades, setups, pat] = await Promise.all([
    listTrades(supabase),
    listSetups(supabase),
    supabase.from("ai_patterns").select("bullets").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const bullets = (pat.data?.bullets as { title: string; detail: string }[] | undefined) ?? [];
  return <HomeView profile={profile} trades={trades} setups={setups} now={new Date()} pattern={bullets[0] ?? null} />;
}
