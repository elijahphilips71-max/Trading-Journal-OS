import "server-only";
import { gbp, pct, rMultiple, shortDate, usd } from "../format";
import type { TradeWithRules } from "../journal";
import type { summarise } from "../summary";
import type { Setup } from "../types";

type Summary = ReturnType<typeof summarise>;

export function tradeContext(t: TradeWithRules, setup: Setup | undefined) {
  const lines = [
    `Trade: ${t.ticker}, ${t.direction === "long" ? "long (bought)" : "short (sold)"}, ${t.status}.`,
    `Opened ${shortDate(t.opened_at, true)}${t.closed_at ? `, closed ${shortDate(t.closed_at, true)}` : ""}.`,
    `Entry ${usd(t.entry)}, stop ${usd(t.stop)}, target ${usd(t.target)}${t.exit != null ? `, exit ${usd(t.exit)}` : ""}.`,
    `Shares ${t.shares}. Risk ${t.risk_pct}% of account = ${gbp(t.risk_gbp)}.`,
  ];
  if (t.status === "closed") lines.push(`Result ${gbp(t.pnl_gbp, { sign: true })} (${rMultiple(t.r_multiple)}).`);
  if (t.target != null) {
    const rr = Math.abs(t.target - t.entry) / Math.abs(t.entry - t.stop);
    lines.push(`Planned reward:risk ${rr.toFixed(1)}.`);
  }
  if (t.exit != null && t.target != null) {
    const toTarget = (t.exit - t.entry) / (t.target - t.entry);
    if (toTarget > 0 && toTarget < 0.95) lines.push(`He exited ${Math.round(toTarget * 100)}% of the way to target.`);
  }
  if (t.exit != null) {
    const beyondStop = t.direction === "long" ? t.exit < t.stop : t.exit > t.stop;
    if (beyondStop) lines.push("He exited BEYOND his stop (the loss was bigger than planned).");
  }
  lines.push(`Setup: ${setup ? `${setup.name} — ${setup.one_liner ?? ""}` : "none chosen"}.`);
  if (setup?.checklist?.length) lines.push(`Setup checklist: ${setup.checklist.join("; ")}.`);
  lines.push(
    `Rules: ${t.trade_rules.map((r) => `${r.followed ? "[followed]" : "[BROKEN]"} ${r.rule_text}`).join("; ") || "none ticked"}.`,
  );
  lines.push(`Emotion: ${t.emotion ?? "not recorded"}.`);
  lines.push(`His notes: ${t.notes?.trim() ? `"${t.notes.trim().slice(0, 1500)}"` : "none"}.`);
  return lines.join("\n");
}

export function statsContext(s: Summary) {
  const st = s.stats;
  return [
    `Paper account: ${gbp(s.balance)} (${gbp(s.change, { sign: true })}, ${pct(s.changePct, { sign: true })}).`,
    `Period: month ${s.progress.month} of ${s.progress.months}, day ${s.progress.day} of ${s.progress.totalDays}.`,
    `Closed trades ${st.trades} (need 30). Win rate ${pct(st.winRate, { dp: 0 })}. Avg win ${gbp(st.avgWin)}, avg loss ${gbp(st.avgLoss)}. Profit factor ${st.profitFactor ?? "—"}. Avg ${rMultiple(st.avgR)}. Rules followed on ${pct(st.rulesFollowedPct, { dp: 0 })} of trades.`,
    `Targets: ${s.targets.map((x) => `${x.name}: ${x.value} (${x.status})`).join("; ")}.`,
  ].join("\n");
}
