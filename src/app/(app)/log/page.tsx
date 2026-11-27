import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { TradeForm } from "@/components/TradeForm";
import { requireOnboarded } from "@/lib/data";
import { gbpUsdRate } from "@/lib/fx";
import { accountBalance, listRules, listSetups, listTrades, recentTickers } from "@/lib/journal";
import { londonDay } from "@/lib/maths";

export const metadata: Metadata = { title: "Log a trade" };

const MODES = [
  { key: "quick", label: "Quick add" },
  { key: "screenshot", label: "Screenshot" },
  { key: "csv", label: "CSV import" },
] as const;

export default async function LogPage({ searchParams }: PageProps<"/log">) {
  const sp = await searchParams;
  const mode = MODES.some((m) => m.key === sp.mode) ? (sp.mode as string) : "quick";
  const { supabase, profile } = await requireOnboarded();
  const [trades, rules, setups, fx] = await Promise.all([
    listTrades(supabase),
    listRules(supabase),
    listSetups(supabase),
    gbpUsdRate(),
  ]);
  const setupParam = typeof sp.setup === "string" ? sp.setup : undefined;

  return (
    <>
      <PageHeader title="Log a trade" />
      <main className="page">
        <nav className="seg" aria-label="How to log">
          {MODES.map((m) => (
            <Link key={m.key} href={`/log?mode=${m.key}`} className={mode === m.key ? "on" : ""} aria-current={mode === m.key ? "page" : undefined}>
              {m.label}
            </Link>
          ))}
        </nav>
        {mode === "quick" && (
          <TradeForm
            mode="new"
            balance={accountBalance(profile.starting_balance, trades)}
            fx={fx.rate}
            fxLive={fx.live}
            defaultRisk={profile.risk_pct}
            rules={rules}
            setups={setups}
            tickers={recentTickers(trades)}
            today={londonDay(new Date())}
            prefill={setupParam && setups.some((s) => s.id === setupParam) ? { setupId: setupParam } : undefined}
          />
        )}
        {mode === "screenshot" && (
          <EmptyState title="Screenshot auto-fill is coming">
            Soon you&apos;ll drop in a TradingView screenshot and the app will fill in the ticker, entry, stop and target for you.
          </EmptyState>
        )}
        {mode === "csv" && (
          <EmptyState title="CSV import is coming">
            Soon you&apos;ll import your TradingView Paper Trading history in one go.
          </EmptyState>
        )}
      </main>
    </>
  );
}
