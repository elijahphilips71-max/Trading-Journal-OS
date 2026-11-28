import type { Metadata } from "next";
import { logOut } from "@/app/actions/profile";
import { PageHeader } from "@/components/PageHeader";
import { requireOnboarded } from "@/lib/data";
import { SettingsForm } from "./SettingsForm";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { profile, email } = await requireOnboarded();
  return (
    <>
      <PageHeader title="Settings" />
      <main className="page">
        <SettingsForm profile={profile} />
        <div className="card">
          <span className="h2">Account</span>
          <span className="muted">
            Logged in as <b style={{ color: "var(--text)" }}>{email}</b>
          </span>
          <a className="btn sec" href="/reset-password">Change password</a>
          <form action={logOut}>
            <button className="btn danger w-full">Log out</button>
          </form>
        </div>
      </main>
    </>
  );
}
