/**
 * What the Quick Play sync is doing, and the two pure decisions made about it.
 *
 * Pure on purpose — no React, no Supabase client. `QuickPlaySyncProvider` needs
 * a DOM and cannot be reached from the node-environment vitest run, so the two
 * rules that actually decide whether a sheet ever reaches Postgres live out
 * here where they can be tested directly rather than re-derived in a test.
 */

export type QuickPlaySyncStatus =
  | { kind: "starting" }
  | { kind: "off" }
  | { kind: "loading" }
  /** `reloading` — the read from `load-failed` running again. Apart from
   *  `loading` because the two show different screens: a first read runs under
   *  a live whiteboard, which is how an admin can start typing into one and
   *  reach `conflict`; a retry runs under the failure panel, with nothing of
   *  this session on screen, and must not flash the blank sheet on the way. */
  | { kind: "reloading" }
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "conflict" }
  /** `missing` — this tab is bound to a row id that is not there. Either the
   *  load read zero rows, or a write matched zero rows and the re-read that
   *  followed it found nothing either. It was deleted, or the link is wrong. */
  | { kind: "missing" }
  /** `refused` — a write matched zero rows but the row still SELECTs, so it was
   *  not deleted: the update policy declined it. In practice this account was
   *  an admin when the page loaded and is not one now. The whiteboard stays on
   *  screen with the user's work on it; nothing more is written. */
  | { kind: "refused" }
  /** `load-failed` — the first read never produced this quick play: the request
   *  errored, or the row came back in a shape the app cannot open. Kept apart
   *  from `error`, which is a *write* that failed after a successful load, for
   *  one reason: there, the sheet on screen is the real one and stays; here,
   *  nothing was ever loaded, so the sheet on screen is a blank default the app
   *  invented. The session page shows a retry instead of that blank — see
   *  `retryLoad` on the sync context. */
  | { kind: "load-failed"; message: string }
  | { kind: "error"; message: string };

/**
 * Whether a write may be scheduled from this status, by this viewer.
 *
 * Load-bearing for loop safety: this stays true across `saving` and `saved`.
 * If it flipped when a write started or finished, the status change would be a
 * dependency change, the save effect would re-run, and every save would
 * schedule the next one. `isAdmin` is stable for the life of a session and does
 * not flip on `saving`/`saved` either, so adding it leaves that guard intact.
 * The statuses left out are the ones where a write would be wrong rather than
 * merely late — nothing is configured (`off`), nothing has loaded yet
 * (`starting`, `loading`, `reloading`), the load never finished (`load-failed`,
 * where the sheet in memory is a blank default and writing it would overwrite a
 * quick play this tab has never seen), the row this tab names does not exist
 * (`missing`), this account may no longer write it (`refused`), or the tab is
 * holding work that would clobber a saved sheet (`conflict`).
 *
 * A non-admin is refused here as a second line of defence; the real refusal is
 * the update policy on `quick_play_sessions`. Note what that policy does,
 * though: a non-admin's UPDATE does not error, it matches zero rows and
 * succeeds — indistinguishable, from the write alone, from writing to a row
 * that was deleted. This flag is a client-side cache of a role that can change
 * under it, so that case is not hypothetical; the provider tells the two apart
 * by re-reading the row before it claims anything, and `refused` is the answer
 * when the row is still there.
 */
export function canSave(status: QuickPlaySyncStatus, isAdmin: boolean): boolean {
  if (!isAdmin) return false;

  return (
    status.kind === "idle" ||
    status.kind === "saving" ||
    status.kind === "saved" ||
    status.kind === "error"
  );
}

/**
 * The way out of `conflict`. Wiping the sheet settles the question the conflict
 * was holding open — the saved row is no longer worth protecting — so saving
 * resumes from `idle` and the empty sheet is written over it.
 *
 * Returns the same object for every other status, so calling this when there is
 * no conflict is a genuine no-op and React bails out of the re-render.
 */
export function clearConflict(status: QuickPlaySyncStatus): QuickPlaySyncStatus {
  return status.kind === "conflict" ? { kind: "idle" } : status;
}
