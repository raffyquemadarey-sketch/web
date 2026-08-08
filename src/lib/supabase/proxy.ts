import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

// The matcher runs this on every page request, so the "not configured" notice is
// latched to once per process instead of once per hop. It lives here rather than
// in `env.ts` because `env.ts` is also imported by the browser client, where a
// module-scope warn would print in end users' consoles.
let warnedNotConfigured = false;

// This is NOT the Next.js proxy entrypoint — `src/proxy.ts` is, and there can
// only be one. This module holds the session-refresh logic it imports.
export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });

  // Nothing to refresh until credentials exist; pass the request through
  // untouched so the app still boots without credentials — but say so, or a
  // misconfiguration looks exactly like a working logged-out app.
  const env = getSupabaseEnv();
  if (!env) {
    if (!warnedNotConfigured) {
      warnedNotConfigured = true;
      console.warn("[supabase] not configured — session refresh disabled");
    }

    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        supabaseResponse = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });

        // Responses that carry refreshed auth cookies must never be cached, or
        // a CDN can hand one user's session to another.
        Object.entries(headers).forEach(([name, value]) => {
          supabaseResponse.headers.set(name, value);
        });
      },
    },
  });

  // The server client initializes lazily, so this call is what actually loads
  // and refreshes the session. It has to happen before the response is
  // committed, otherwise the refreshed cookies are lost.
  try {
    const { error } = await supabase.auth.getClaims();

    // An auth failure here is returned, not thrown, and it means the session
    // was dropped (an expired or already-rotated refresh token, say). The
    // request still continues as a logged-out one, but log it — otherwise a
    // surprise sign-out leaves no trace anywhere.
    if (error) {
      console.warn("[supabase] session refresh failed:", error.message);
    }
  } catch (error) {
    // Anything that is not an AuthError propagates out of `getClaims` — a
    // malformed JWKS key that `crypto.subtle.importKey` rejects, for one. The
    // matcher covers every page path, so rethrowing would 500 the whole site,
    // logged-out visitors on public pages included. Degrade to "session not
    // refreshed on this hop" instead.
    console.error("[supabase] session refresh threw:", error);
  }

  // Return the exact object `setAll` mutated — building a fresh NextResponse
  // here would drop the Set-Cookie headers. That holds on the failure paths
  // above too: `setAll` receives the complete cookie set in one call, so if it
  // ran at all it ran to completion, and the response then carries freshly
  // rotated cookies plus the no-store headers. Throwing those away would leave
  // the browser holding tokens the server has already spent. If `setAll` never
  // ran, this is still the untouched pass-through created above.
  return supabaseResponse;
}
