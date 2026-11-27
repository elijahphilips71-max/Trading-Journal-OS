import type { DadReport } from "@/lib/dad";
import { gbp, pct } from "@/lib/format";

const INK = { ok: "#116B43", warn: "#8A5A00", bad: "#B42318", neutral: "#4A5468" };
const BOX = { ok: "#E3F6EC", warn: "#FBF0DA", bad: "#FDE6E4", neutral: "#E6E9F0" };

function when(at: string | null) {
  if (!at) return "no trades yet";
  const d = new Date(at);
  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", ...o }).format(d);
  const sameDay = fmt({ dateStyle: "short" }) === new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", dateStyle: "short" }).format(new Date());
  return `updated ${sameDay ? "today" : fmt({ day: "numeric", month: "short" })} ${fmt({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}`;
}

/** The light, read-only summary Dad sees. Used by the public page and the preview. */
export function DadReportCard({ r }: { r: DadReport }) {
  const possessive = r.name === "My" ? "MY" : `${r.name.toUpperCase()}'S`;
  return (
    <div className="card" style={{ background: "#F4F6FA", color: "#141821", borderColor: "#F4F6FA" }}>
      <div className="flex flex-col gap-0.5">
        <span style={{ fontSize: 12, color: "#4A5468", fontWeight: 600 }}>{possessive} PAPER TRADING · LIVE</span>
        <span style={{ fontSize: 20, fontWeight: 700, color: r.tone === "neutral" ? "#141821" : INK[r.tone] }}>{r.headline}</span>
        <span style={{ fontSize: 12, color: "#4A5468" }}>
          {r.dayLine} · {when(r.updatedAt)}
        </span>
      </div>

      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(r.months.length, 4)}, minmax(0, 1fr))` }}>
        {r.months.map((m, i) => {
          const tone = m.returnPct == null ? "neutral" : m.returnPct > 0 ? "ok" : m.returnPct < 0 ? "bad" : "neutral";
          return (
            <div key={i} className="flex flex-col gap-0.5 rounded-[10px] p-2.5" style={{ background: BOX[tone] }}>
              <span style={{ fontSize: 11, color: "#4A5468", fontWeight: 600 }}>{m.label}</span>
              <b className="num" style={{ color: INK[tone] }}>
                {m.returnPct == null ? "—" : pct(m.returnPct, { sign: true, dp: 1 })}
              </b>
            </div>
          );
        })}
      </div>

      <div>
        {r.targets.map((t) => (
          <div key={t.name} className="flex justify-between gap-2.5 py-2 text-[13px]" style={{ borderTop: "1px solid #DDE2EB" }}>
            <span>{t.name}</span>
            <b className="num whitespace-nowrap" style={{ color: INK[t.tone] }}>
              {t.value}
              {t.tone === "ok" ? " ✓" : t.tone === "bad" ? " ✗" : ""}
            </b>
          </div>
        ))}
        <div className="flex justify-between py-2 text-[13px]" style={{ borderTop: "1px solid #DDE2EB" }}>
          <span>Trades so far</span>
          <b className="num">
            {r.trades.done} of {r.trades.needed}
          </b>
        </div>
      </div>

      {r.latest && (
        <div className="flex flex-col gap-1 rounded-[10px] bg-white px-3 py-2.5 text-[13px]" style={{ lineHeight: 1.45 }}>
          <b>
            Latest: {r.latest.ticker}, <span className="num">{gbp(r.latest.pnlGbp, { sign: true })}</span>
          </b>
          <span style={{ color: "#4A5468" }}>&ldquo;{r.latest.note}&rdquo;</span>
        </div>
      )}
      {r.coach && (
        <div className="rounded-[10px] bg-white px-3 py-2.5 text-[13px]" style={{ lineHeight: 1.45 }}>
          <b>Coach summary:</b> {r.coach}
        </div>
      )}
    </div>
  );
}
