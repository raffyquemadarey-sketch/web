"use client";

/**
 * Mirrors the Quick Play whiteboard to one owner-scoped Supabase row.
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
 * Ownership is a Supabase anonymous identity, but it is minted by the create
 * form — see `./owner` — and never here, so a visitor who opens a quick play
 * they do not own never gets an `auth.users` row from this component. The
 * session cookie the browser client writes is refreshed by `src/proxy.ts`, so
 * nothing extra is needed there.
 *
 * Every failure path degrades to "in memory, and say so on screen": an
 * unconfigured project, a row that is not ours, an unreachable host and an
 * unreadable row all leave the whiteboard fully usable.
 */

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import type { Tournament } from "@/lib/data/types";
import {
  useDemoActions,
  useQuickPlay,
  useQuickPlayDirty,
} from "@/lib/demo/demo-data-provider";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseEnv } from "@/lib/supabase/env";

import { messageOf } from "./owner";
import type { QuickPlayClient } from "./owner";
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
};

const QuickPlaySyncContext = createContext<QuickPlaySyncValue | null>(null);

/* The helper below lives at module scope on purpose: an effect that closed over
   component-defined functions would need them in its dependency array, and this
   codebase cannot reach for `useCallback` (the React Compiler is on). */

/** `null` when the row landed, `"missing"` when the update matched no row, or
 *  the error message. UPDATE rather than upsert on purpose: an upsert keyed on
 *  an id we do not own would either collide or, for an id that simply does not
 *  exist, invent a row at an address the user only guessed at. An update that
 *  matches nothing does nothing — and `count` is how we find out, without the
 *  `.select()` round trip that returning the row would cost. */
async function writeSession(
  supabase: QuickPlayClient,
  session: Tournament,
  ownerId: string,
  sessionId: string,
): Promise<string | "missing" | null> {
  try {
    const { error, count } = await supabase
      .from("quick_play_sessions")
      .update(toQuickPlayRow(session, ownerId), { count: "exact" })
      .eq("id", sessionId);

    if (error) return error.message;
    return count === 0 ? "missing" : null;
  } catch (error) {
    return messageOf(error);
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

  // `starting` renders nothing, so the server HTML and the first client render
  // agree and there is no hydration mismatch to explain away.
  const [status, setStatus] = useState<QuickPlaySyncStatus>({ kind: "starting" });

  /* Whether either writer below may run. False in `conflict`, which is what
     stops this tab writing over a saved sheet it declined to load — and why
     `resolveConflict` exists at all. See `./sync-status` for why it stays true
     across `saving` and `saved`. */
  const savable = canSave(status);

  const latest = useRef({ session, dirty, actions, savable });
  const ownerRef = useRef<string | null>(null);
  /** The last session object successfully written. Reference equality against
   *  the reducer's output is the "nothing new to write" test. */
  const savedRef = useRef<Tournament | null>(null);
  const chainRef = useRef<Promise<void>>(Promise.resolve());

  // No dependency array on purpose: the mount-only effects below never see a
  // fresh closure, so this is what keeps what they read current.
  useEffect(() => {
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

      setStatus({ kind: "loading" });

      const supabase = createClient();
      const claims = await supabase.auth.getClaims();
      if (cancelled) return;

      if (claims.error) {
        setStatus({ kind: "error", message: claims.error.message });
        return;
      }

      // No identity at all, so this browser cannot own any quick play. Same
      // outcome as a row that is not ours, deliberately: nothing here tells the
      // visitor whether the id exists.
      const sub = claims.data?.claims.sub;
      if (!sub) {
        setStatus({ kind: "missing" });
        return;
      }

      ownerRef.current = sub;

      const { data, error } = await supabase
        .from("quick_play_sessions")
        .select("*")
        .eq("id", sessionId)
        .maybeSingle();
      if (cancelled) return;

      if (error) {
        setStatus({ kind: "error", message: error.message });
        return;
      }

      // Absent, or someone else's. RLS returns zero rows for both and the app
      // must not tell them apart.
      if (!data) {
        setStatus({ kind: "missing" });
        return;
      }

      const restored = fromQuickPlayRow(data);
      if (!restored) {
        setStatus({
          kind: "error",
          message: "this quick play could not be read",
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

    // `getClaims` can throw rather than return — see `ensureOwner`. An
    // unhandled rejection here would surface as a console throw on a page that
    // is otherwise working perfectly well in memory.
    void load().catch((error: unknown) => {
      if (!cancelled) setStatus({ kind: "error", message: messageOf(error) });
    });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!dirty || !savable) return;
    // This exact object is already in the database — the other half of the
    // loop guard, and what makes the flush below idempotent.
    if (session === savedRef.current) return;

    const timer = setTimeout(() => {
      const snapshot = latest.current.session;
      setStatus({ kind: "saving" });

      chainRef.current = chainRef.current.then(async () => {
        // The load sets this before `canSave` can ever be true, so this is a
        // type narrowing rather than a real branch.
        const ownerId = ownerRef.current;
        if (!ownerId) return;

        const result = await writeSession(
          createClient(),
          snapshot,
          ownerId,
          sessionId,
        );

        if (result === "missing") {
          setStatus({ kind: "missing" });
          return;
        }

        if (result) {
          // No retry timer: the copy promises another attempt on the next
          // change, and the next change re-runs this effect by itself.
          setStatus({ kind: "error", message: result });
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

      const ownerId = ownerRef.current;
      const snapshot = latest.current.session;
      if (!ownerId) return;
      // The same gate the debounced write is under, read through the ref
      // because this effect is mount-only. Without it, switching tabs during a
      // `conflict` would write the very sheet the conflict is refusing to
      // write, and the status line's "nothing is being saved" would be a lie.
      if (!latest.current.savable) return;
      if (!latest.current.dirty || snapshot === savedRef.current) return;

      chainRef.current = chainRef.current.then(async () => {
        const result = await writeSession(
          createClient(),
          snapshot,
          ownerId,
          sessionId,
        );
        if (result === null) savedRef.current = snapshot;
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
      const ownerId = ownerRef.current;
      const snapshot = latest.current.session;
      if (!ownerId || !latest.current.savable) return;
      if (!latest.current.dirty || snapshot === savedRef.current) return;

      chainRef.current = chainRef.current.then(async () => {
        const result = await writeSession(
          createClient(),
          snapshot,
          ownerId,
          sessionId,
        );
        if (result === null) savedRef.current = snapshot;
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
