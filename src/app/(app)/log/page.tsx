import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export const metadata: Metadata = { title: "Log a trade" };

export default function Page() {
  return (
    <>
      <PageHeader title="Log a trade" />
      <main className="page">
        <EmptyState title="Coming soon">Quick add, screenshot auto-fill and CSV import will live here.</EmptyState>
      </main>
    </>
  );
}
