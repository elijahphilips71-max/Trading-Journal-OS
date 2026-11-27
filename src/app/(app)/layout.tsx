import { AppShell } from "@/components/AppShell";
import { requireOnboarded } from "@/lib/data";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireOnboarded();
  return <AppShell>{children}</AppShell>;
}
