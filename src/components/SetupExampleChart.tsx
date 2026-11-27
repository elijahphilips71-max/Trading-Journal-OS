/**
 * Annotated example of the "Sweep + FVG" setup: price sweeps an old low, breaks
 * structure (BOS) upward, leaves a fair value gap, and you buy the retrace into it.
 * Drawn from made-up prices, ported from the approved design mockup.
 */

const CLOSES = [114.6, 113.2, 111.8, 112.3, 110.6, 108.9, 109.3, 107.6, 105.6, 106.4, 107.2, 106.3, 105.7, 105.5, 106.2, 108.4, 109.0, 108.6, 108.0, 109.8, 111.3, 112.6, 114.0, 115.4];
const FIRST_OPEN = 115.0;
const SWEEP_LOW_INDEX = 13;
const SWEEP_LOW = 104.3;
const STOP = 104.1;
const TARGET = 115.3;
const ENTRY = 107.9;
const ENTRY_INDEX = 18;

const W = 340;
const H = 190;

function build() {
  const top = 14;
  const bot = 10;
  const cs = CLOSES.map((c, i) => {
    const o = i ? CLOSES[i - 1] : FIRST_OPEN;
    const w = 0.3 + (i % 3) * 0.18;
    return { o, c, h: Math.max(o, c) + w, l: i === SWEEP_LOW_INDEX ? SWEEP_LOW : Math.min(o, c) - w };
  });
  const lo = Math.min(...cs.map((k) => k.l), STOP, TARGET) - 0.4;
  const hi = Math.max(...cs.map((k) => k.h), STOP, TARGET) + 0.4;
  const y = (p: number) => +(top + ((hi - p) / (hi - lo)) * (H - top - bot)).toFixed(1);
  const step = (W - 50) / CLOSES.length;
  const bw = +(step * 0.62).toFixed(1);
  const x = (i: number) => +(6 + i * step + bw / 2).toFixed(1);
  let bull = "";
  let bear = "";
  let wick = "";
  cs.forEach((k, i) => {
    const left = +(6 + i * step).toFixed(1);
    const yt = y(Math.max(k.o, k.c));
    const hg = Math.max(1, +(y(Math.min(k.o, k.c)) - yt).toFixed(1));
    const d = `M${left} ${yt}h${bw}v${hg}h-${bw}Z`;
    if (k.c >= k.o) bull += d;
    else bear += d;
    wick += `M${x(i)} ${y(k.h)}V${y(k.l)}`;
  });
  return { bull, bear, wick, x, y };
}

const c = build();
const fvgX = c.x(14);
const fvgY = c.y(107.92);
const fvgH = +(c.y(106.86) - c.y(107.92)).toFixed(1);

export function SetupExampleChart() {
  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Example chart: price falls, wicks below an old low marked in yellow (the sweep), then rallies above the last high (BOS), leaving a blue gap zone. Buy when price returns into the gap, stop under the sweep, target the old high."
    >
      <rect x={fvgX} y={fvgY} width={+(W - fvgX).toFixed(1)} height={fvgH} fill="#7EA6FF" fillOpacity="0.2" />
      <line x1="0" x2={W} y1={c.y(TARGET)} y2={c.y(TARGET)} stroke="#36D399" strokeDasharray="4 3" />
      <line x1="0" x2={W} y1={c.y(STOP)} y2={c.y(STOP)} stroke="#FF8080" strokeDasharray="4 3" />
      <line x1={c.x(7)} x2={c.x(15)} y1={c.y(104.94)} y2={c.y(104.94)} stroke="#F5C866" strokeWidth="1.2" strokeDasharray="3 2" />
      <line x1={c.x(10)} x2={c.x(16)} y1={c.y(107.68)} y2={c.y(107.68)} stroke="#E6EAF2" strokeWidth="1" />
      <path d={c.wick} stroke="#5B6478" strokeWidth="1" />
      <path d={c.bull} fill="#36D399" />
      <path d={c.bear} fill="#FF8080" />
      <circle cx={c.x(ENTRY_INDEX)} cy={c.y(ENTRY)} r="5" fill="none" stroke="#E6EAF2" strokeWidth="1.5" />
      <text x={c.x(ENTRY_INDEX) - 22} y={c.y(ENTRY) + 18} fill="#E6EAF2" fontSize="10" fontWeight="600" fontFamily="Inter, sans-serif">
        Buy here
      </text>
      <text x={c.x(10)} y={c.y(107.68) - 4} fill="#E6EAF2" fontSize="9" fontWeight="600" fontFamily="monospace">
        BOS
      </text>
      <text x={c.x(13) - 14} y={c.y(SWEEP_LOW) + 13} fill="#F5C866" fontSize="9.5" fontWeight="600" fontFamily="Inter, sans-serif">
        Sweep
      </text>
      <text x="336" y={c.y(107.39) + 3} fill="#9DBBFF" fontSize="9" textAnchor="end" fontFamily="monospace">
        GAP (FVG)
      </text>
      <text x="120" y={c.y(TARGET) + 12} fill="#36D399" fontSize="9.5" fontFamily="Inter, sans-serif">
        Old high = target
      </text>
      <text x="336" y={c.y(STOP) + 10} fill="#FF9A9A" fontSize="9" textAnchor="end" fontFamily="monospace">
        STOP
      </text>
    </svg>
  );
}

export function TrendDiagram() {
  return (
    <svg
      width="100%"
      viewBox="0 0 340 132"
      role="img"
      aria-label="An uptrend makes higher highs and higher lows: look for buys. A downtrend makes lower highs and lower lows: sit out for now."
    >
      <text x="12" y="18" fill="#5BE3AB" fontSize="10.5" fontWeight="600" fontFamily="Inter, sans-serif">
        Uptrend: look for buys
      </text>
      <polyline points="14,112 44,78 62,94 96,56 116,74 152,32" fill="none" stroke="#36D399" strokeWidth="2" strokeLinejoin="round" />
      {[
        [54, 108, "HL"],
        [86, 50, "HH"],
        [108, 88, "HL"],
        [138, 28, "HH"],
        [224, 46, "LH"],
        [256, 104, "LL"],
        [278, 68, "LH"],
        [300, 126, "LL"],
      ].map(([x, y, t]) => (
        <text key={`${x}`} x={x} y={y} fill="#C9D1E0" fontSize="9" fontFamily="monospace">
          {t}
        </text>
      ))}
      <line x1="170" x2="170" y1="10" y2="122" stroke="#222A39" />
      <text x="182" y="18" fill="#FF9A9A" fontSize="10.5" fontWeight="600" fontFamily="Inter, sans-serif">
        Downtrend: sit out
      </text>
      <polyline points="184,34 214,68 232,52 266,90 286,74 322,114" fill="none" stroke="#FF8080" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
