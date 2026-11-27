import { Logo } from "@/components/Logo";
import { supabaseConfigured } from "@/lib/supabase/env";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Shown until the Supabase keys are added to the hosting settings. */
export default function SetupPage() {
  if (supabaseConfigured()) redirect("/login");
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col gap-5 px-6" style={{ paddingTop: 56 }}>
      <div className="flex flex-col items-center gap-2.5">
        <Logo size={96} />
        <span className="h2" style={{ fontSize: 22 }}>Almost ready</span>
      </div>
      <div className="card" style={{ lineHeight: 1.55 }}>
        <span>OS Journal needs its Supabase keys before you can log in.</span>
        <ol className="list">
          <li>In Supabase, open your project, then Project Settings, then API.</li>
          <li>
            Copy the <b>Project URL</b> and the <b>anon public</b> key.
          </li>
          <li>
            Add them to your hosting settings as <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, then redeploy.
          </li>
        </ol>
      </div>
    </main>
  );
}
