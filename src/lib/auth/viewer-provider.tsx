"use client";

/**
 * The app's one answer to "who is looking at this".
 *
 * It is cosmetic. It decides which controls render, never whether a write is
 * allowed — that is RLS's job, and RLS does it whether this component is right
 * or not. See the policy block in
 * `supabase/migrations/20260820000000_quick_play_sessions.sql`.
 *
 * A signed-out visitor costs nothing: `getClaims()` returns `{ data: null,
 * error: null }` without a network call when there is no stored session. A
 * signed-in one costs one cached JWKS fetch plus one `profiles` row read per
 * route, which is the price of showing the account cluster in the site-wide nav.
 */

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { createClient } from "@/lib/supabase/client";
import type { SupabaseBrowserClient } from "@/lib/supabase/client";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { messageOf } from "@/lib/supabase/error-message";

import { toViewerRole } from "./viewer";
import type { Viewer } from "./viewer";

const ViewerContext = createContext<Viewer | null>(null);

/**
 * The role read, with exactly one retry.
 *
 * Worth the second request because of what a single failure costs: `isAdmin`
 * cannot tell a read that failed from a role of `member`, so one dropped
 * request turns a real admin into a viewer with every editing control gone.
 * One retry, not a loop — if the connection is down, saying so beats hammering
 * it, and the `error` viewer below is what says so.
 */
async function readRole(supabase: SupabaseBrowserClient, userId: string) {
  const read = () =>
    supabase.from("profiles").select("role").eq("id", userId).maybeSingle();

  const first = await read();
  return first.error ? await read() : first;
}

export function ViewerProvider({ children }: { children: ReactNode }) {
  // `loading` renders identically on the server and in the first client render,
  // so there is no hydration mismatch — the same reason `QuickPlaySyncProvider`
  // starts in `starting`.
  const [viewer, setViewer] = useState<Viewer>({ kind: "loading" });
  /** Bumped by the auth listener below; re-runs the read. */
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    let cancelled = false;

    // Everything that moves the viewer lives inside `load`, the immediate cases
    // included: `react-hooks/set-state-in-effect` rightly objects to setting
    // state synchronously in an effect body, and this is a report on an external
    // system rather than derived state.
    const load = async () => {
      if (!getSupabaseEnv()) {
        setViewer({ kind: "unconfigured" });
        return;
      }

      const supabase = createClient();
      const claims = await supabase.auth.getClaims();
      if (cancelled) return;

      if (claims.error) {
        setViewer({ kind: "error", message: claims.error.message });
        return;
      }

      // Destructured rather than read through `claims.data?.`, so the email
      // below is narrowed alongside the subject.
      const payload = claims.data?.claims;
      const sub = payload?.sub;
      if (!payload || !sub) {
        setViewer({ kind: "signed-out" });
        return;
      }

      // The role is a table read rather than a JWT claim: a custom claim would
      // need an access-token hook configured in the dashboard, and reading one
      // off `JwtPayload` yields `any`, which this codebase forbids.
      const { data, error } = await readRole(supabase, sub);
      if (cancelled) return;

      // `error` rather than falling through to a `member`-shaped viewer: the
      // difference is what lets the UI say "we couldn't check your account"
      // instead of telling an admin they are not one. See
      // `describeViewerError`.
      if (error) {
        setViewer({ kind: "error", message: error.message });
        return;
      }

      setViewer({
        kind: "signed-in",
        userId: sub,
        email: payload.email ?? null,
        role: toViewerRole(data?.role),
      });
    };

    // `getClaims` can throw rather than return — a malformed JWKS key, say. An
    // unhandled rejection here would surface as a console throw on a page that
    // is otherwise working perfectly well.
    void load().catch((error: unknown) => {
      if (!cancelled) setViewer({ kind: "error", message: messageOf(error) });
    });

    return () => {
      cancelled = true;
    };
  }, [reloads]);

  // The callback does nothing but bump a counter, and that is load-bearing:
  // calling another Supabase method from inside an auth callback can deadlock
  // the client's internal lock, so the re-read happens in the effect above.
  // `INITIAL_SESSION` and `TOKEN_REFRESHED` are ignored — the first duplicates
  // the initial load, the second changes neither identity nor role.
  useEffect(() => {
    if (!getSupabaseEnv()) return;

    const { data } = createClient().auth.onAuthStateChange((event) => {
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "USER_UPDATED"
      ) {
        setReloads((n) => n + 1);
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <ViewerContext.Provider value={viewer}>{children}</ViewerContext.Provider>
  );
}

export function useViewer(): Viewer {
  const value = useContext(ViewerContext);
  if (!value) {
    throw new Error("useViewer must be used inside <ViewerProvider>.");
  }
  return value;
}
