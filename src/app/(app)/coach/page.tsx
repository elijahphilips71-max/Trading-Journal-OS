import type { Metadata } from "next";
import Link from "next/link";
import { CoachChat } from "@/components/CoachPanel";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { aiConfigured } from "@/lib/ai/coach";
import { requireOnboarded } from "@/lib/data";
import { gradeClass, shortDate } from "@/lib/format";
import { coachMessages } from "@/lib/journal";

export const metadata: Metadata = { title: "AI coach" };

type ReviewRow = { id: string; grade: string; fix_next: string; created_at: string; trade_id: string; trades: { ticker: string } | null };

export default async function CoachPage() {
  const { supabase } = await requireOnboarded();
  const aiOn = aiConfigured();
  const [messages, { data }] = await Promise.all([
    coachMessages(supabase, null),
    supabase
      .from("ai_reviews")
      .select("id, grade, fix_next, created_at, trade_id, trades(ticker)")
      .eq("kind", "review")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  const reviews = (data ?? []) as unknown as ReviewRow[];

  return (
    <>
      <PageHeader title="AI coach" />
      <main className="page">
        {!aiOn && (
          <div className="notice warn">
            The coach switches on once an AI key is added to the app&apos;s settings (ANTHROPIC_API_KEY in Vercel).
          </div>
        )}
        <CoachChat
          tradeId={null}
          aiOn={aiOn}
          messages={messages}
          placeholder="e.g. What's my biggest mistake this month?"
          suggestions={["What's my biggest mistake so far?", "Am I on track for Dad's targets?", "What should I focus on this week?"]}
        />
        <section className="flex flex-col gap-2.5">
          <span className="h2">Latest reviews</span>
          {reviews.length === 0 ? (
            <EmptyState title="No reviews yet">Close a trade and the coach grades it here.</EmptyState>
          ) : (
            reviews.map((r) => (
              <Link key={r.id} href={`/trades/${r.trade_id}`} className="trow items-start">
                <span className={`pill ${gradeClass(r.grade)}`}>{r.grade}</span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <b>
                    {r.trades?.ticker ?? "Trade"} · {shortDate(r.created_at)}
                  </b>
                  <span className="muted text-[13px]" style={{ lineHeight: 1.45 }}>
                    {r.fix_next}
                  </span>
                </div>
              </Link>
            ))
          )}
        </section>
        <span className="muted text-center text-xs">
          The coach coaches your process. It never tells you what to buy or sell.
        </span>
      </main>
    </>
  );
}
