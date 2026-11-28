import { gbp } from "@/lib/format";

type Point = { day: string; balance: number };

/** Simple SVG line of the account balance after each closed trade. */
export function EquityCurve({ start, points, height = 140 }: { start: number; points: Point[]; height?: number }) {
  const values = [start, ...points.map((p) => p.balance)];
  if (values.length < 2) {
    return (
      <div className="muted flex items-center justify-center text-[13px]" style={{ height }}>
        Your balance line appears after your first closed trade.
      </div>
    );
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.1 || 1;
  const lo = min - pad;
  const hi = max + pad;
  const W = 320;
  const H = 100;
  const xy = values.map((v, i) => [(i / (values.length - 1)) * W, H - ((v - lo) / (hi - lo)) * H] as const);
  const line = xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `0,${H} ${line} ${W},${H}`;
  const last = values[values.length - 1];
  const colour = last >= start ? "#36D399" : "#FF8080";
  const baseY = H - ((start - lo) / (hi - lo)) * H;
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Balance went from ${gbp(start)} to ${gbp(last)} over ${points.length} closed trades`}
    >
      <line x1="0" x2={W} y1={baseY} y2={baseY} stroke="#2A3345" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
      <polyline points={area} fill={colour} fillOpacity="0.12" stroke="none" />
      <polyline points={line} fill="none" stroke={colour} strokeWidth="1.8" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
