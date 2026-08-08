import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "./database.types";
import { requireSupabaseEnv } from "./env";

// Next.js throws `ReadonlyRequestCookiesError` when a Server Component tries to
// write a cookie. It is not exported publicly, and it does not set `name` — that
// stays `"Error"` — so match on the stable error code Next.js attaches to it,
// with the constructor name as a fallback.
function isReadonlyCookiesError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const code = (error as { __NEXT_ERROR_CODE?: string }).__NEXT_ERROR_CODE;

  return (
    code === "E1180" ||
    error.constructor.name === "ReadonlyRequestCookiesError"
  );
}

// Supabase client for Server Components, Server Functions and Route Handlers.
// Create a new one per request — never hoist it to module scope or share it
// across requests, because it carries that request's cookies.
export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = requireSupabaseEnv();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch (error) {
          // Setting cookies during a Server Component render throws — only
          // Server Functions and Route Handlers may write them. Ignoring that
          // one is safe: the proxy refreshes the session and writes the cookies
          // back on every navigation.
          //
          // Any other failure must not be swallowed. Auth cookies are written
          // in chunks, so a throw partway through this loop would commit a
          // partial set that `@supabase/ssr` later refuses to reassemble — a
          // silent sign-out instead of an error.
          if (!isReadonlyCookiesError(error)) {
            throw error;
          }
        }
      },
    },
  });
}
