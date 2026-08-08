import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";
import { requireSupabaseEnv } from "./env";

// Browser-side Supabase client. Only import this from Client Components — it
// reads and writes `document.cookie`.
export function createClient() {
  const { url, key } = requireSupabaseEnv();

  return createBrowserClient<Database>(url, key);
}
