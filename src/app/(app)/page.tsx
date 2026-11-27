import { requireOnboarded } from "@/lib/data";
import { listSetups, listTrades } from "@/lib/journal";
import { HomeView } from "./HomeView";

export default async function HomePage() {
  const { supabase, profile } = await requireOnboarded();
  const [trades, setups] = await Promise.all([listTrades(supabase), listSetups(supabase)]);
  return <HomeView profile={profile} trades={trades} setups={setups} now={new Date()} />;
}
