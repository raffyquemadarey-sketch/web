// The two public Supabase values, read in one place so "not configured yet"
// behaves the same everywhere.
//
// These must stay full static `process.env.NEXT_PUBLIC_*` expressions: Next.js
// inlines them into the browser bundle at build time, and a dynamic lookup such
// as `process.env[name]` is never inlined.
// The key slot is forgiving in both directions: either variable name works, and
// under either name the value may be a new-scheme publishable key or a legacy
// anon key. The `NEXT_PUBLIC_SUPABASE_ANON_KEY` fallback is what older Supabase
// setups and hosting projects configured before the rename already have set, and
// it applies whenever the publishable variable is missing *or* blank — copying
// `.env.local.example` leaves `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=` as `""`,
// so `||` (not `??`) is what matches the `!url || !key` check below.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Returns the Supabase credentials, or `null` when either one is missing. */
export function getSupabaseEnv(): { url: string; key: string } | null {
  if (!url || !key) {
    return null;
  }

  return { url, key };
}

/** Same as `getSupabaseEnv`, but throws instead of returning `null`. */
export function requireSupabaseEnv(): { url: string; key: string } {
  const env = getSupabaseEnv();

  if (!env) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local (or .env) — see .env.local.example. Note that an empty value in .env.local shadows a working one in .env, so delete any key you are not filling in rather than leaving it blank.",
    );
  }

  return env;
}
