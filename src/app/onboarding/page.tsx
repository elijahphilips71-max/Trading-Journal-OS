import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { requireProfile } from "@/lib/data";
import { OnboardingForm } from "./OnboardingForm";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const { profile } = await requireProfile();
  if (profile.onboarded) redirect("/");
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[460px] flex-col gap-5 px-6 pb-10" style={{ paddingTop: 48 }}>
      <div className="flex flex-col items-center gap-2.5 text-center">
        <Logo size={80} />
        <span style={{ fontSize: 24, fontWeight: 800 }}>Welcome to OS Journal</span>
        <span className="muted" style={{ lineHeight: 1.5 }}>
          Four quick questions to set up your paper account. You can change these later in Settings.
        </span>
      </div>
      <OnboardingForm profile={profile} />
    </main>
  );
}
