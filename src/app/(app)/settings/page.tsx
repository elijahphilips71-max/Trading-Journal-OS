import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return (
    <>
      <PageHeader title="Settings" />
      <main className="page">
        <EmptyState title="Settings">Your account, starting balance and risk settings will live here.</EmptyState>
      </main>
    </>
  );
}
