import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export const metadata: Metadata = { title: "Stats" };

export default function Page() {
  return (
    <>
      <PageHeader title="Stats" />
      <main className="page">
        <EmptyState title="No stats yet">Once you close a few trades you will see your win rate, equity curve and calendar here.</EmptyState>
      </main>
    </>
  );
}
