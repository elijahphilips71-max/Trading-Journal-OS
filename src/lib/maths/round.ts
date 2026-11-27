/** Round to a number of decimal places, avoiding float noise like 1.005 → 1.00. */
export function round(n: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round((n + Number.EPSILON) * f) / f;
}

/** Round down, so a position never risks more than planned. */
export function floorTo(n: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.floor((n + Number.EPSILON) * f) / f;
}
