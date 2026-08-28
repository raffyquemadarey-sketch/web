/**
 * What the Quick Play sync is doing, and the two pure decisions made about it.
 *
 * Pure on purpose — no React, no Supabase client. `QuickPlaySyncProvider` and
 * `QuickPlaySession` both need a DOM and cannot be reached from the
 * node-environment vitest run, so the rule that decides whether a sheet ever
 * reaches Postgres and the rule that decides whether it reaches the screen live
 * out here where they can be tested directly rather than re-derived in a test.
 */

export type QuickPlaySyncStatus =
  | { kind: "starting" }
  | { kind: "off" }
  | { kind: "loading" }
  /** `reloading` — the read from `load-failed` running again. Apart from
   *  `loading` because the two say different things under the same header: a
   *  first read is "Opening this quick play…", a retry is "Trying again…".
   *  Neither one puts the whiteboard on screen — see `isOpening`. */
  | { kind: "reloading" }
  | { kind: "saving" }
  /** `saved` — what is on screen is what is in the row. Both a finished load
   *  and a finished write leave a tab here, which is the same claim either
   *  way. */
  | { kind: "saved" }
  /** `missing` — this tab is bound to a row id that is not there. Either the
   *  load read zero rows, or a write matched zero rows and the re-read that
   *  followed it found nothing either. It was deleted, or the link is wrong. */
  | { kind: "missing" }
  /** `refused` — a write matched zero rows but the row still SELECTs, so it was
   *  not deleted: the update policy declined it. Either this account was an
   *  admin when the page loaded and is not one now, or the row's `created_by`
   *  moved to someone else under it. The whiteboard stays on screen with the
   *  user's work on it; nothing more is written. */
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
 * schedule the next one. `canWrite` is stable for the life of a session and does
 * not flip on `saving`/`saved` either, so adding it leaves that guard intact.
 * The statuses left out are the ones where a write would be wrong rather than
 * merely late — nothing is configured (`off`), nothing has loaded yet
 * (`starting`, `loading`, `reloading`), the load never finished (`load-failed`,
 * where the sheet in memory is a blank default and writing it would overwrite a
 * quick play this tab has never seen), the row this tab names does not exist
 * (`missing`), or this account may no longer write it (`refused`).
 *
 * `canWrite` means "this viewer is the admin who created this quick play", and
 * anyone else is refused here as a second line of defence; the real refusal is
 * the update policy on `quick_play_sessions`. Note what that policy does,
 * though: a declined UPDATE does not error, it matches zero rows and
 * succeeds — indistinguishable, from the write alone, from writing to a row
 * that was deleted. This flag folds a cached role with a cached creator id, and
 * `refused` now has two causes: the account was demoted, or this tab believed it
 * owned a quick play it does not. The provider tells either one apart from a
 * deletion the same way — by re-reading the row before it claims anything — and
 * `refused` is the answer when the row is still there.
 */
export function canSave(status: QuickPlaySyncStatus, canWrite: boolean): boolean {
  if (!canWrite) return false;

  return (
    status.kind === "saving" || status.kind === "saved" || status.kind === "error"
  );
}

/**
 * Whether none of this quick play is on screen yet.
 *
 * The three statuses before the first read resolves, and the one gate that
 * keeps two separate lies off the page. The sheet in memory during them is
 * `createQuickPlaySession()` — a blank default `openQuickPlay` binds while the
 * request is in flight — so rendering the whiteboard would put "Players (0)",
 * four empty teams and no bracket under this session's name as though they had
 * been read from the row. And `created_by` arrives with that row, so until it
 * does, the admin who created this quick play and an admin who did not are
 * indistinguishable: every sentence about who may change it would be a guess.
 *
 * `QuickPlaySession` renders a header and nothing else while this holds. The
 * cost is real and accepted: an admin cannot start a sheet during the read, and
 * must wait for it — which is the same wait as the one they already have before
 * anything they type could be saved.
 */
export function isOpening(status: QuickPlaySyncStatus): boolean {
  return (
    status.kind === "starting" ||
    status.kind === "loading" ||
    status.kind === "reloading"
  );
}
