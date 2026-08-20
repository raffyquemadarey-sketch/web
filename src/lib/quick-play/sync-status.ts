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
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "conflict" }
  /** `missing` — this tab is bound to a row id that returned zero rows: either
   *  it does not exist, or it belongs to another identity. RLS makes those
   *  indistinguishable on purpose, so the app treats them identically. */
  | { kind: "missing" }
  | { kind: "error"; message: string };

/**
 * Whether a write may be scheduled from this status.
 *
 * Load-bearing for loop safety: this stays true across `saving` and `saved`.
 * If it flipped when a write started or finished, the status change would be a
 * dependency change, the save effect would re-run, and every save would
 * schedule the next one. The statuses left out are the ones where a write would
 * be wrong rather than merely late — nothing is configured (`off`), nothing has
 * loaded yet (`starting`, `loading`), the row this tab names is not one we can
 * write (`missing`), where a write would silently do nothing, or the tab is
 * holding work that would clobber a saved sheet (`conflict`).
 */
export function canSave(status: QuickPlaySyncStatus): boolean {
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
