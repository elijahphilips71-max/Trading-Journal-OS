/** Real time-zone conversion for New York market times (US and UK clocks change on different dates). */

function offsetMinutes(at: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** A New York wall-clock time on a day ("2026-11-30", "09:30") as a UTC Date. */
export function nyTime(day: string, hhmm: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const first = new Date(guess.getTime() - offsetMinutes(guess, "America/New_York") * 60000);
  // Re-check with the offset at the real instant (matters only near a clock change).
  return new Date(guess.getTime() - offsetMinutes(first, "America/New_York") * 60000);
}

/** "14:30" in UK time. */
export function ukClock(at: Date): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(at);
}

export function addMinutes(at: Date, mins: number) {
  return new Date(at.getTime() + mins * 60000);
}
