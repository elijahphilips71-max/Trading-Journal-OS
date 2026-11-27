import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export const metadata: Metadata = { title: "AI coach" };

export default function Page() {
  return (
    <>
      <PageHeader title="AI coach" />
      <main className="page">
        <EmptyState title="Your AI coach">After each trade the coach grades your process and spots patterns. It never tells you what to buy.</EmptyState>
      </main>
    </>
  );
}
