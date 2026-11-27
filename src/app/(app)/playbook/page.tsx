import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export const metadata: Metadata = { title: "Playbook" };

export default function Page() {
  return (
    <>
      <PageHeader title="Playbook" />
      <main className="page">
        <EmptyState title="Your playbook">Step 1 Bias, Step 2 Setup, and the Trade today? news check will live here.</EmptyState>
      </main>
    </>
  );
}
