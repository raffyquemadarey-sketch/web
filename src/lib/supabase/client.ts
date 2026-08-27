import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";
import { requireSupabaseEnv } from "./env";

// Browser-side Supabase client. Only import this from Client Components — it
// reads and writes `document.cookie`.
export function createClient() {
  const { url, key } = requireSupabaseEnv();

  return createBrowserClient<Database>(url, key);
}

/** The browser client's type, for helpers that take one. `createBrowserClient`
 *  returns a per-page singleton, so this is always the same instance. */
export type SupabaseBrowserClient = ReturnType<typeof createClient>;
