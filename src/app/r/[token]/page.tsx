import type { Metadata } from "next";
import { DadReportCard } from "@/components/DadReportCard";
import { Logo } from "@/components/Logo";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadDadReport } from "@/lib/share";

export const metadata: Metadata = { title: "Paper trading progress", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

async function load(token: string) {
  if (!/^[0-9a-f]{64}$/.test(token)) return { state: "missing" as const };
  const admin = createAdminClient();
  if (!admin) return { state: "not_ready" as const };
  const { data: link } = await admin.from("share_links").select("user_id, enabled, show_notes, show_ai").eq("token", token).maybeSingle();
  if (!link || !link.enabled) return { state: "missing" as const };
  const report = await loadDadReport(admin, link.user_id, link);
  return report ? { state: "ok" as const, report } : { state: "missing" as const };
}

/** Dad's public, read-only page. Only the whitelisted DadReport is rendered. */
export default async function SharePage({ params }: PageProps<"/r/[token]">) {
  const { token } = await params;
  const res = await load(token);

  return (
    <div className="min-h-dvh" style={{ background: "#E9EDF4", color: "#141821" }}>
      <main className="mx-auto flex max-w-[560px] flex-col gap-3.5 px-4 py-6">
        <div className="flex items-center gap-2" style={{ color: "#141821" }}>
          <Logo size={28} />
          <span className="font-bold">OS Journal</span>
        </div>
        {res.state === "ok" ? (
          <>
            <DadReportCard r={res.report} />
            <p className="text-[12px]" style={{ color: "#4A5468", lineHeight: 1.5 }}>
              Paper trading means practice trades with pretend money. The goal: hit all 4 targets over 3 months before a real account is opened. This page
              updates live and can&apos;t be edited.
            </p>
          </>
        ) : (
          <div className="card" style={{ background: "#F4F6FA", color: "#141821", borderColor: "#F4F6FA" }}>
            <span className="font-bold">{res.state === "not_ready" ? "Not set up yet" : "This link isn't active"}</span>
            <span style={{ color: "#4A5468", lineHeight: 1.5 }}>
              {res.state === "not_ready"
                ? "The app owner still needs to finish setting this page up."
                : "It may have been switched off or replaced with a new link. Ask for the latest one."}
            </span>
          </div>
        )}
      </main>
    </div>
  );
}
