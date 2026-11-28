import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "./env";

/** Pages anyone can open without logging in. */
export const PUBLIC_PATHS = ["/login", "/auth", "/reset-password", "/r/", "/setup"];

export function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p.endsWith("/") ? p : p + "/"));
}

/**
 * Runs before every page. Refreshes the login session cookie and sends
 * logged-out visitors to /login, remembering where they were going.
 */
export async function updateSession(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!supabaseConfigured()) {
    // No Supabase keys yet: show the setup page instead of crashing.
    if (isPublicPath(pathname)) return NextResponse.next();
    return NextResponse.redirect(new URL("/setup", request.url));
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Do not put code between createServerClient and getClaims: it refreshes the session.
  const { data } = await supabase.auth.getClaims();
  const loggedIn = Boolean(data?.claims?.sub);

  if (!loggedIn && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  if (loggedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}
