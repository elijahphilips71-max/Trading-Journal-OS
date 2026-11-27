import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export const metadata: Metadata = { title: "Trades" };

export default function Page() {
  return (
    <>
      <PageHeader title="Trades" />
      <main className="page">
        <EmptyState title="No trades yet">Every trade you log shows up here, with filters for wins, losses and open trades.</EmptyState>
      </main>
    </>
  );
}
