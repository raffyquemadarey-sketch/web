"use client";

/**
 * Mirrors the Quick Play whiteboard to one Supabase row.
 *
 * The reducer stays the sole source of truth for rendering, so every edit is
 * instant and persistence trails it. Writes are debounced whole-row updates,
 * serialised through a promise chain so they land in Postgres in the order they
 * were made; the conflict model is deliberately last-write-wins, one row per
 * quick play, no merge. The one case that is not last-write-wins is a saved row
 * arriving after the user has already started typing: that pauses saving in
 * `conflict` rather than picking a winner, and the user resolves it by
 * reloading or by wiping the sheet.
 *
 * The row is neither owner-scoped nor private: anyone can read it, signed in or
 * not, and only an admin can write it. Loading therefore asks for no identity
 * at all. Whether this tab writes is `canSave(status, admin)`, and the admin
 * half of that comes from `ViewerProvider` — cosmetic, like every other check in
 * the browser; the update policy is what actually refuses a non-admin.
 *
 * Every failure path says so on screen, and the two halves say different things.
 * A write that fails degrades to "in memory, and say so": the sheet on screen is
 * the real one, so it stays and stays usable. A *load* that fails cannot degrade
 * that way — nothing was loaded, so the sheet in memory is a blank default that
 * belongs to no quick play — and reports `load-failed`, which the session page
 * renders as a retry rather than as an empty whiteboard.
 */

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { isAdmin } from "@/lib/auth/viewer";
import { useViewer } from "@/lib/auth/viewer-provider";
import type { Tournament } from "@/lib/data/types";
import {
  useDemoActions,
  useQuickPlay,
  useQuickPlayDirty,
} from "@/lib/demo/demo-data-provider";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseBrowserClient } from "@/lib/supabase/client";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { messageOf } from "@/lib/supabase/error-message";

import { fromQuickPlayRow, toQuickPlayRow } from "./session-row";
import { canSave, clearConflict } from "./sync-status";
import type { QuickPlaySyncStatus } from "./sync-status";

/** Long enough that typing a team name is one request, short enough to feel live. */
const SAVE_DEBOUNCE_MS = 800;

type QuickPlaySyncValue = {
  status: QuickPlaySyncStatus;
  /** Abandons a saved sheet the tab declined to load, so writes resume. The
   *  caller is expected to have emptied the whiteboard first — see the wipe in
   *  `QuickPlaySaveStatus`, which is the only place this is called from. */
  resolveConflict: () => void;
  /** Runs the initial read again after it failed. A no-op in every other
   *  status, so it can never re-read over a sheet that did load — least of all
   *  over the unsaved work a `refused` or `conflict` tab is holding. */
  retryLoad: () => void;
};

const QuickPlaySyncContext = createContext<QuickPlaySyncValue | null>(null);

/* The helper below lives at module scope on purpose: an effect that closed over
   component-defined functions would need them in its dependency array, and this
   codebase cannot reach for `useCallback` (the React Compiler is on). */

/** What one write did. The three failures are separate because each needs a
 *  different, true thing said about it on screen.
 *
 *  UPDATE rather than upsert on purpose: an upsert keyed on an id that does not
 *  exist would invent a row at an address the user only guessed at. An update
 *  that matches nothing does nothing — and `count` is how we find out, without
 *  the `.select()` round trip that returning the row would cost. */
type WriteResult =
  | { kind: "saved" }
  | { kind: "missing" }
  | { kind: "refused" }
  | { kind: "error"; message: string };

async function writeSession(
  supabase: SupabaseBrowserClient,
  session: Tournament,
  sessionId: string,
): Promise<WriteResult> {
  try {
    const { error, count } = await supabase
      .from("quick_play_sessions")
      .update(toQuickPlayRow(session), { count: "exact" })
      .eq("id", sessionId);

    if (error) return { kind: "error", message: error.message };
    if (count !== 0) return { kind: "saved" };

    // Zero rows has two causes and they want opposite screens. The row was
    // deleted — or the update policy declined this account, which does not
    // error, it just matches nothing. `admin` in the provider is a cached role
    // that can go stale mid-session, so the second case is real. Reads are
    // public, so re-reading the id settles it, and only ever on this rare path:
    // an ordinary save is still one request.
    const reread = await supabase
      .from("quick_play_sessions")
      .select("id")
      .eq("id", sessionId)
      .maybeSingle();

    if (reread.error) return { kind: "error", message: reread.error.message };
    return reread.data ? { kind: "refused" } : { kind: "missing" };
  } catch (error) {
    return { kind: "error", message: messageOf(error) };
  }
}

export function QuickPlaySyncProvider({
  sessionId,
  children,
}: {
  sessionId: string;
  children: ReactNode;
}) {
  const session = useQuickPlay();
  const dirty = useQuickPlayDirty();
  const actions = useDemoActions();
  const admin = isAdmin(useViewer());

  // `starting` renders nothing, so the server HTML and the first client render
  // agree and there is no hydration mismatch to explain away.
  const [status, setStatus] = useState<QuickPlaySyncStatus>({ kind: "starting" });
  /** Bumped by `retryLoad`, and read by nothing but the load effect's
   *  dependency array — incrementing it is what runs the read again. */
  const [attempt, setAttempt] = useState(0);

  /* Whether either writer below may run. False for everyone who is not an
     admin, and false in `conflict`, which is what stops this tab writing over a
     saved sheet it declined to load — and why `resolveConflict` exists at all.
     See `./sync-status` for why it stays true across `saving` and `saved`. */
  const savable = canSave(status, admin);

  const latest = useRef({ session, dirty, actions, savable });
  /** The last session object successfully written. Reference equality against
   *  the reducer's output is the "nothing new to write" test. */
  const savedRef = useRef<Tournament | null>(null);
  const chainRef = useRef<Promise<void>>(Promise.resolve());

  // No dependency array on purpose: the mount-only effects below never see a
  // fresh closure, so this is what keeps what they read current.
  useEffect(() => {
    // Not `admin`: `savable` already folds it in, and a second copy of the same
    // fact would read like the gate without being one.
    latest.current = { session, dirty, actions, savable };
  });

  useEffect(() => {
    let cancelled = false;

    // Everything that moves the status lives inside `load`, including the two
    // immediate cases: `react-hooks/set-state-in-effect` rightly objects to
    // setting state synchronously in an effect body, and this is a report on an
    // external system rather than derived state, so an async report is correct.
    // Binding the store to this id is here for the same reason.
    const load = async () => {
      latest.current.actions.openQuickPlay(sessionId);

      if (!getSupabaseEnv()) {
        setStatus({ kind: "off" });
        return;
      }

      // `attempt` is zero on the first read and only ever bumped by
      // `retryLoad`, so this is exactly "am I the retry?" — and the retry runs
      // under the failure panel, which must not blink into a blank whiteboard
      // and back while the second request is in flight.
      setStatus(attempt === 0 ? { kind: "loading" } : { kind: "reloading" });

      // No identity is asked for: the select policy is `using (true)`, so a
      // signed-out visitor reads the row exactly as an admin does. That also
      // saves a round trip on every session open.
      const supabase = createClient();

      const { data, error } = await supabase
        .from("quick_play_sessions")
        .select("*")
        .eq("id", sessionId)
        .maybeSingle();
      if (cancelled) return;

      if (error) {
        setStatus({ kind: "load-failed", message: error.message });
        return;
      }

      // Reads are public, so zero rows means exactly one thing: there is no
      // quick play at this id.
      if (!data) {
        setStatus({ kind: "missing" });
        return;
      }

      // The row is there and unreadable — a shape this build of the app cannot
      // open. Still `load-failed`: nothing loaded, so there is nothing true to
      // put on the whiteboard, and "no quick play at this address" would be a
      // different lie from the blank one.
      const restored = fromQuickPlayRow(data);
      if (!restored) {
        setStatus({
          kind: "load-failed",
          message: "this quick play was saved in a shape this page can't open",
        });
        return;
      }

      // The user started a sheet while the row was still in flight. Neither one
      // is thrown away silently — `restoreQuickPlay` declines, saving stops,
      // and the status line offers the two exits: reload to take the saved
      // sheet, or wipe to take this one (`resolveConflict`).
      if (latest.current.dirty) {
        setStatus({ kind: "conflict" });
        return;
      }

      latest.current.actions.restoreQuickPlay(sessionId, restored);
      savedRef.current = restored;
      setStatus({ kind: "saved" });
    };

    // A fetch can throw rather than return an error — an unreachable host, for
    // one. An unhandled rejection here would surface as a console throw on a
    // page showing a whiteboard that is not this quick play.
    void load().catch((error: unknown) => {
      if (!cancelled) setStatus({ kind: "load-failed", message: messageOf(error) });
    });

    return () => {
      cancelled = true;
    };
    // `attempt` is the retry: `retryLoad` bumps it, and the read runs again
    // from the top, `openQuickPlay` included. That re-clear is harmless here
    // and nowhere else, because the only status offering a retry is the one
    // where the sheet being cleared is a blank default nobody has touched.
  }, [sessionId, attempt]);

  useEffect(() => {
    if (!dirty || !savable) return;
    // This exact object is already in the database — the other half of the
    // loop guard, and what makes the flush below idempotent.
    if (session === savedRef.current) return;

    const timer = setTimeout(() => {
      const snapshot = latest.current.session;
      setStatus({ kind: "saving" });

      chainRef.current = chainRef.current.then(async () => {
        const result = await writeSession(createClient(), snapshot, sessionId);

        if (result.kind !== "saved") {
          // `missing`, `refused` and `error` are statuses in their own right,
          // so the result is the status. No retry timer for `error`: the copy
          // promises another attempt on the next change, and the next change
          // re-runs this effect by itself. `refused` and `missing` both stop
          // `canSave`, so neither retries at all.
          setStatus(result);
          return;
        }

        savedRef.current = snapshot;
        setStatus({ kind: "saved" });
      });
    }, SAVE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [dirty, session, savable, sessionId]);

  // Best effort, and only that: a hidden tab can be frozen or discarded before
  // the request leaves, and there is nothing to await it with. It costs one
  // request and saves the last edit of a session closed mid-debounce.
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState !== "hidden") return;

      const snapshot = latest.current.session;
      // The same gate the debounced write is under, read through the ref
      // because this effect is mount-only. It carries three jobs: nothing is
      // written unless a load finished (`savable` is false in `starting`,
      // `loading`, `reloading` and `load-failed`, so the blank sheet behind a
      // failed read can never be flushed over the saved one), nothing is
      // written by a viewer who is not an admin, and
      // switching tabs during a `conflict` does not write the very sheet the
      // conflict is refusing to write — which would make the status line's
      // "nothing is being saved" a lie.
      if (!latest.current.savable) return;
      if (!latest.current.dirty || snapshot === savedRef.current) return;

      chainRef.current = chainRef.current.then(async () => {
        const result = await writeSession(createClient(), snapshot, sessionId);
        if (result.kind === "saved") savedRef.current = snapshot;
      });
    };

    document.addEventListener("visibilitychange", flush);
    return () => document.removeEventListener("visibilitychange", flush);
  }, [sessionId]);

  // The client-side-navigation twin of the tab-hide flush above. Leaving a
  // quick play unmounts this provider, and `openQuickPlay` clears the slot on
  // the way into the next one, so without this the last edit inside the debounce
  // window would be dropped on the floor. Same gates, same promise chain, same
  // best-effort contract — the request outlives the component either way.
  useEffect(() => {
    return () => {
      const snapshot = latest.current.session;
      if (!latest.current.savable) return;
      if (!latest.current.dirty || snapshot === savedRef.current) return;

      chainRef.current = chainRef.current.then(async () => {
        const result = await writeSession(createClient(), snapshot, sessionId);
        if (result.kind === "saved") savedRef.current = snapshot;
      });
    };
  }, [sessionId]);

  return (
    <QuickPlaySyncContext.Provider
      value={{
        status,
        // The updater form rather than the current `status`: the click that
        // calls this also dispatches the wipe, and reading a status captured at
        // render time would be a race with nothing to gain.
        resolveConflict: () => setStatus(clearConflict),
        retryLoad: () => {
          if (status.kind !== "load-failed") return;
          setAttempt((n) => n + 1);
        },
      }}
    >
      {children}
    </QuickPlaySyncContext.Provider>
  );
}

export function useQuickPlaySync(): QuickPlaySyncValue {
  const value = useContext(QuickPlaySyncContext);
  if (!value) {
    throw new Error("useQuickPlaySync must be used inside <QuickPlaySyncProvider>.");
  }
  return value;
}
