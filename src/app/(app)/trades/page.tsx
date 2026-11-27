import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { TradeRow } from "@/components/TradeRow";
import { requireOnboarded } from "@/lib/data";
import { listSetups, listTrades } from "@/lib/journal";

export const metadata: Metadata = { title: "Trades" };

const FILTERS = [
  { key: "all", label: "All" },
  { key: "wins", label: "Wins" },
  { key: "losses", label: "Losses" },
  { key: "open", label: "Open" },
] as const;

export default async function TradesPage({ searchParams }: PageProps<"/trades">) {
  const sp = await searchParams;
  const f = FILTERS.some((x) => x.key === sp.f) ? (sp.f as string) : "all";
  const setupFilter = typeof sp.setup === "string" ? sp.setup : null;
  const { supabase } = await requireOnboarded();
  const [trades, setups] = await Promise.all([listTrades(supabase), listSetups(supabase)]);
  const setupName = new Map(setups.map((s) => [s.id, s.name]));

  const shown = trades.filter((t) => {
    if (setupFilter && t.setup_id !== setupFilter) return false;
    if (f === "wins") return t.status === "closed" && (t.pnl_gbp ?? 0) > 0;
    if (f === "losses") return t.status === "closed" && (t.pnl_gbp ?? 0) < 0;
    if (f === "open") return t.status === "open";
    return true;
  });

  const href = (key: string, setup: string | null) => {
    const q = new URLSearchParams();
    if (key !== "all") q.set("f", key);
    if (setup) q.set("setup", setup);
    const s = q.toString();
    return s ? `/trades?${s}` : "/trades";
  };

  return (
    <>
      <PageHeader title="Trades" />
      <main className="page">
        <div className="chips" role="group" aria-label="Filter trades">
          {FILTERS.map((x) => (
            <Link key={x.key} href={href(x.key, setupFilter)} className={`chip ${f === x.key ? "on" : ""}`}>
              {x.label}
            </Link>
          ))}
        </div>
        {setups.length > 1 && (
          <div className="chips" role="group" aria-label="Filter by setup">
            <Link href={href(f, null)} className={`chip ${!setupFilter ? "on" : ""}`}>
              Any setup
            </Link>
            {setups.map((s) => (
              <Link key={s.id} href={href(f, s.id)} className={`chip ${setupFilter === s.id ? "on" : ""}`}>
                {s.name}
              </Link>
            ))}
          </div>
        )}
        {trades.length === 0 ? (
          <EmptyState title="No trades yet">
            Every trade you log shows up here.{" "}
            <Link href="/log">Log your first trade</Link>.
          </EmptyState>
        ) : shown.length === 0 ? (
          <EmptyState title="Nothing here">No trades match this filter.</EmptyState>
        ) : (
          <div className="flex flex-col gap-2.5">
            <span className="muted text-xs">
              {shown.length} trade{shown.length === 1 ? "" : "s"}
            </span>
            {shown.map((t) => (
              <TradeRow key={t.id} trade={t} setupName={t.setup_id ? setupName.get(t.setup_id) : null} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
