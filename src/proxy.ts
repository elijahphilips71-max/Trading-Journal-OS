import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except Next.js internals, icons and other static files.
    "/((?!_next/static|_next/image|icons/|icon.svg|manifest.webmanifest|sw.js|offline.html|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)",
  ],
};
