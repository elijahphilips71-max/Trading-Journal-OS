import type { TargetStatus } from "@/lib/maths";

const MAP: Record<TargetStatus | "passed", [string, string]> = {
  on_track: ["ok", "On track"],
  done: ["ok", "Done"],
  passed: ["ok", "Passed"],
  passing: ["ok", "Passing"],
  watch: ["warn", "Watch it"],
  failing: ["bad", "Failing"],
  not_started: ["neutral", "Not yet"],
};

export function StatusPill({ status, label }: { status: TargetStatus | "passed"; label?: string }) {
  const [cls, text] = MAP[status];
  return <span className={`pill ${cls}`}>{label ?? text}</span>;
}
