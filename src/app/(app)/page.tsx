import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { PlusIcon } from "@/components/icons";

export default function HomePage() {
  return (
    <>
      <PageHeader title="OS Journal" logo />
      <main className="page">
        <div className="card" style={{ gap: 14 }}>
          <div className="row">
            <div className="flex flex-col gap-0.5">
              <span className="lbl">ROAD TO A REAL ACCOUNT</span>
              <span style={{ fontSize: 20, fontWeight: 700 }}>Let&apos;s get started</span>
            </div>
            <span className="pill info">Day 1</span>
          </div>
          <div className="bar">
            <div style={{ width: "2%" }} />
          </div>
          <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
            Hit all 4 of Dad&apos;s targets over 3 months of paper trading and he opens your real account.
          </div>
        </div>
        <Link href="/log" className="btn pri">
          <PlusIcon size={20} />
          Log a trade
        </Link>
      </main>
    </>
  );
}
