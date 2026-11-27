import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export const metadata: Metadata = { title: "Dad's view" };

export default function Page() {
  return (
    <>
      <PageHeader title="Dad's view" />
      <main className="page">
        <EmptyState title="Dad's view">Share a live, read-only link with Dad so he can follow your progress.</EmptyState>
      </main>
    </>
  );
}
