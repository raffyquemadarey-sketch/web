import type { createClient } from "@/lib/supabase/client";

/**
 * Who owns a quick play, and how one comes to exist.
 *
 * Ownership is a Supabase anonymous identity per browser. It is minted at
 * creation time and nowhere else — the create form is this module's only
 * caller — so someone who reads the list and leaves never gets an `auth.users`
 * row. The session cookie the browser client writes is refreshed by
 * `src/proxy.ts`, so nothing extra is needed there.
 */

export type QuickPlayClient = ReturnType<typeof createClient>;

export type OwnerResult =
  | { ok: true; ownerId: string }
  | { ok: false; reason: "disabled" }
  | { ok: false; reason: "failed"; message: string };

/**
 * The current identity, minting an anonymous one only if there isn't one yet.
 * `getClaims()` returns `{ data: null, error: null }` for "no session", which is
 * how a first-time visitor is told apart from a broken one.
 */
export async function ensureOwner(
  supabase: QuickPlayClient,
): Promise<OwnerResult> {
  try {
    const claims = await supabase.auth.getClaims();
    if (claims.error) {
      return { ok: false, reason: "failed", message: claims.error.message };
    }

    const sub = claims.data?.claims.sub;
    if (sub) {
      return { ok: true, ownerId: sub };
    }

    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      if (error.code === "anonymous_provider_disabled") {
        return { ok: false, reason: "disabled" };
      }
      return { ok: false, reason: "failed", message: error.message };
    }

    const ownerId = data.user?.id;
    if (!ownerId) {
      return { ok: false, reason: "failed", message: "sign-in returned no user" };
    }

    return { ok: true, ownerId };
  } catch (error) {
    // Not every auth failure is returned rather than thrown — see the same
    // reasoning in `@/lib/supabase/proxy`. Never let one reach the page.
    return { ok: false, reason: "failed", message: messageOf(error) };
  }
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "something went wrong";
}
