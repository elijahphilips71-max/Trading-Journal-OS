/** Public Supabase settings. Both are safe to expose to the browser. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** False until the real Supabase project URL and anon key are set. */
export function supabaseConfigured() {
  return (
    SUPABASE_URL.startsWith("https://") &&
    !SUPABASE_URL.includes("example.supabase.co") &&
    !SUPABASE_URL.includes("your-project-ref") &&
    SUPABASE_ANON_KEY.length > 20
  );
}
