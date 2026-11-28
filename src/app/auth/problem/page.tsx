import { Logo } from "@/components/Logo";
import { logOut } from "@/app/actions/profile";

export const dynamic = "force-dynamic";
export const metadata = { title: "Account problem · OS Journal" };

/** Plain-English help for each database error code we expect to see here. */
function explain(code: string) {
  if (code === "42501")
    return {
      what: "You're logged in, but the database won't let the app read your profile.",
      fix: "In Supabase, open SQL Editor, paste in supabase/migrations/0002_grants.sql from the repo, and press Run.",
    };
  if (code === "42P01" || code === "PGRST205")
    return {
      what: "You're logged in, but the database tables haven't been made yet.",
      fix: "In Supabase, open SQL Editor, paste in supabase/migrations/0001_init.sql from the repo, and press Run.",
    };
  return {
    what: "You're logged in, but the app couldn't load or create your profile.",
    fix: "Log out, then log in again. If this page comes back, send Claude a screenshot of it.",
  };
}

/**
 * Shown when someone is logged in but has no usable profile. Before this page existed,
 * that case sent him to /login, which sent him back home: an endless redirect loop.
 */
export default async function ProblemPage({ searchParams }: PageProps<"/auth/problem">) {
  const raw = (await searchParams).code;
  const code = (typeof raw === "string" && raw.slice(0, 40)) || "unknown";
  const { what, fix } = explain(code);
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col gap-5 px-6" style={{ paddingTop: 56 }}>
      <div className="flex flex-col items-center gap-2.5">
        <Logo size={96} />
        <span className="h2" style={{ fontSize: 22 }}>Something&apos;s not set up</span>
      </div>
      <div className="card" style={{ lineHeight: 1.55 }}>
        <span>{what}</span>
        <span>
          <b>To fix it:</b> {fix}
        </span>
        <span className="muted">
          Error code: <span className="num">{code}</span>
        </span>
      </div>
      <form action={logOut}>
        <button className="btn" type="submit" style={{ width: "100%", minHeight: 44 }}>
          Log out
        </button>
      </form>
    </main>
  );
}
