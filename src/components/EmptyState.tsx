import type { ReactNode } from "react";

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card items-center text-center" style={{ padding: "32px 20px" }}>
      <span className="h2">{title}</span>
      {children && <div className="muted" style={{ lineHeight: 1.5, maxWidth: 360 }}>{children}</div>}
    </div>
  );
}
