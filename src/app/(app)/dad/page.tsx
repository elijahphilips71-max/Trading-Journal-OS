import type { Metadata } from "next";
import { DadReportCard } from "@/components/DadReportCard";
import { PageHeader } from "@/components/PageHeader";
import { requireOnboarded } from "@/lib/data";
import { loadDadReport, type ShareLink } from "@/lib/share";
import { ShareSettings } from "./ShareSettings";

export const metadata: Metadata = { title: "Dad's view" };

export default async function DadPage() {
  const { supabase, userId } = await requireOnboarded();
  let { data: link } = await supabase.from("share_links").select("token, enabled, show_notes, show_ai").maybeSingle<ShareLink>();
  if (!link) {
    // Older accounts made before the share table existed: create the row now.
    ({ data: link } = await supabase.from("share_links").insert({}).select("token, enabled, show_notes, show_ai").single<ShareLink>());
  }
  const report = await loadDadReport(supabase, userId, link ?? { show_notes: false, show_ai: false });

  return (
    <>
      <PageHeader title="Dad's view" />
      <main className="page">
        {link ? (
          <ShareSettings
            key={link.token}
            token={link.token}
            enabled={link.enabled}
            showNotes={link.show_notes}
            showAi={link.show_ai}
            serverReady={!!process.env.SUPABASE_SERVICE_ROLE_KEY}
          />
        ) : (
          <div className="notice bad">Couldn&apos;t load your share link. Refresh to try again.</div>
        )}
        <span className="lbl mt-1">PREVIEW: WHAT DAD SEES</span>
        {report && <DadReportCard r={report} />}
        <span className="muted text-[12px]" style={{ lineHeight: 1.5 }}>
          Dad only sees this card. He can&apos;t see your trades list, prices, screenshots, email or anything else, and he can&apos;t change anything.
        </span>
      </main>
    </>
  );
}
