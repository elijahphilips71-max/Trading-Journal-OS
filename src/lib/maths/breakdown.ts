import { round } from "./round";
import type { ClosedTrade } from "./stats";

export type GroupStat = { key: string; trades: number; wins: number; pnl: number; avgR: number; winRate: number };

/** Win/loss summary per group (setup, emotion, weekday…). Sorted by P&L, best first. */
export function groupStats<T extends ClosedTrade>(trades: T[], keyOf: (t: T) => string): GroupStat[] {
  const map = new Map<string, T[]>();
  for (const t of trades) {
    const k = keyOf(t);
    map.set(k, [...(map.get(k) ?? []), t]);
  }
  return [...map.entries()]
    .map(([key, list]) => {
      const wins = list.filter((t) => t.pnlGbp > 0).length;
      return {
        key,
        trades: list.length,
        wins,
        pnl: round(list.reduce((s, t) => s + t.pnlGbp, 0), 2),
        avgR: round(list.reduce((s, t) => s + t.r, 0) / list.length, 2),
        winRate: round((wins / list.length) * 100, 1),
      };
    })
    .sort((a, b) => b.pnl - a.pnl);
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function weekdayOf(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export type CalendarCell = { day: string; date: number; pnl: number | null; trades: number; holiday: boolean; inMonth: boolean };

/**
 * Mon–Fri calendar for a month ("YYYY-MM"), one row per week.
 * Days outside the month pad the first and last weeks.
 */
export function monthCalendar(month: string, trades: ClosedTrade[], holidays: (day: string) => boolean): CalendarCell[][] {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const last = new Date(Date.UTC(y, m, 0));
  // Go back to the Monday on or before the 1st.
  const start = new Date(first);
  start.setUTCDate(first.getUTCDate() - ((first.getUTCDay() + 6) % 7));
  const byDay = new Map<string, { pnl: number; n: number }>();
  for (const t of trades) {
    const v = byDay.get(t.closedDay) ?? { pnl: 0, n: 0 };
    byDay.set(t.closedDay, { pnl: v.pnl + t.pnlGbp, n: v.n + 1 });
  }
  const weeks: CalendarCell[][] = [];
  const cur = new Date(start);
  while (cur <= last) {
    const week: CalendarCell[] = [];
    for (let i = 0; i < 7; i++) {
      const dow = cur.getUTCDay();
      if (dow !== 0 && dow !== 6) {
        const day = cur.toISOString().slice(0, 10);
        const v = byDay.get(day);
        week.push({
          day,
          date: cur.getUTCDate(),
          pnl: v ? round(v.pnl, 2) : null,
          trades: v?.n ?? 0,
          holiday: holidays(day),
          inMonth: cur.getUTCMonth() === m - 1,
        });
      }
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export function shiftMonth(month: string, by: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}
