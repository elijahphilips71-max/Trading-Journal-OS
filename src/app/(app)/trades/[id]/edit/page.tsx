import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { TradeForm } from "@/components/TradeForm";
import { requireOnboarded } from "@/lib/data";
import { accountBalance, getTrade, listRules, listSetups, listTrades } from "@/lib/journal";
import { londonDay } from "@/lib/maths";

export const metadata: Metadata = { title: "Edit trade" };

export default async function EditTradePage({ params }: PageProps<"/trades/[id]/edit">) {
  const { id } = await params;
  const { supabase, profile } = await requireOnboarded();
  const [trade, trades, rules, setups] = await Promise.all([
    getTrade(supabase, id),
    listTrades(supabase),
    listRules(supabase),
    listSetups(supabase),
  ]);
  if (!trade) notFound();

  return (
    <>
      <PageHeader title={`Edit ${trade.ticker}`} back={`/trades/${trade.id}`} />
      <main className="page">
        {trade.needs_details && (
          <div className="notice warn">This trade was imported. Add the setup, rules and how you felt, then save.</div>
        )}
        <TradeForm
          mode="edit"
          trade={trade}
          balance={accountBalance(profile.starting_balance, trades)}
          fx={trade.fx_entry}
          fxLive
          defaultRisk={trade.risk_pct}
          rules={rules}
          setups={setups}
          tickers={[]}
          today={londonDay(new Date())}
        />
      </main>
    </>
  );
}
