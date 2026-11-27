import Link from "next/link";
import { gbp, rMultiple, shortDate, tone } from "@/lib/format";
import type { Trade } from "@/lib/types";

export function TradeRow({ trade, setupName }: { trade: Trade; setupName?: string | null }) {
  const open = trade.status === "open";
  const dir = trade.direction === "long" ? "Long" : "Short";
  return (
    <Link href={`/trades/${trade.id}`} className="trow">
      <div className="tk">{trade.ticker.slice(0, 5)}</div>
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <b className="truncate">
          {trade.ticker} · {setupName ?? dir}
        </b>
        <span className="muted truncate text-xs">
          {open ? `${dir} · since ${shortDate(trade.opened_at)}` : `Closed ${shortDate(trade.closed_at)}`}
          {trade.emotion ? ` · ${trade.emotion}` : ""}
          {trade.needs_details ? " · needs details" : ""}
        </span>
      </div>
      {open ? (
        <span className="pill info">Open</span>
      ) : (
        <div className="flex flex-col items-end gap-[3px]">
          <span className={`num font-semibold ${tone(trade.pnl_gbp)}`}>{gbp(trade.pnl_gbp, { sign: true })}</span>
          <span className="num muted text-xs">{rMultiple(trade.r_multiple)}</span>
        </div>
      )}
    </Link>
  );
}
