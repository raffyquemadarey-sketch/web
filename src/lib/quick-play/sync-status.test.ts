import { describe, expect, it } from "vitest";

import { createQuickPlaySession } from "@/lib/demo/quick-play";
import { demoReducer } from "@/lib/demo/reducer";
import type { DemoState } from "@/lib/demo/reducer";

import { canSave, isOpening } from "./sync-status";
import type { QuickPlaySyncStatus } from "./sync-status";

const EVERY_STATUS: QuickPlaySyncStatus[] = [
  { kind: "starting" },
  { kind: "off" },
  { kind: "loading" },
  { kind: "reloading" },
  { kind: "saving" },
  { kind: "saved" },
  { kind: "missing" },
  { kind: "refused" },
  { kind: "load-failed", message: "permission denied for table quick_play_sessions" },
  { kind: "error", message: "network unreachable" },
];

describe("canSave", () => {
  it("holds steady across a write, so the save effect cannot re-trigger itself", () => {
    // The dependency the save effect watches. If starting or finishing a write
    // changed this, every save would schedule the next one.
    expect(canSave({ kind: "saving" }, true)).toBe(true);
    expect(canSave({ kind: "saved" }, true)).toBe(true);
  });

  it("refuses to write before anything has loaded, or when nothing can", () => {
    expect(canSave({ kind: "starting" }, true)).toBe(false);
    expect(canSave({ kind: "loading" }, true)).toBe(false);
    expect(canSave({ kind: "reloading" }, true)).toBe(false);
    expect(canSave({ kind: "off" }, true)).toBe(false);
    expect(canSave({ kind: "missing" }, true)).toBe(false);
  });

  it("stops writing once a write has been refused", () => {
    /* `admin` here is a cached role that went stale: this tab still believes it
       may write, and the database has already said otherwise. Retrying would
       only produce the same zero rows, once per keystroke. */
    expect(canSave({ kind: "refused" }, true)).toBe(false);
  });

  it("retries after a failure, because the next change is the retry", () => {
    expect(canSave({ kind: "error", message: "network unreachable" }, true)).toBe(
      true,
    );
  });

  it("never writes the blank sheet left behind by a load that failed", () => {
    /* The difference between the two failures: `error` is a write that failed
       over the real sheet, so retrying is right. `load-failed` means nothing
       was ever read, so the sheet in memory is `createQuickPlaySession()` —
       writing it would overwrite a saved quick play with a default this tab
       invented. The session page shows a retry instead of that sheet. */
    expect(
      canSave({ kind: "load-failed", message: "network unreachable" }, true),
    ).toBe(false);
  });
});

describe("canSave, for a viewer who may not write this quick play", () => {
  it("refuses every status, the three that would otherwise save included", () => {
    /* Two ways to land here: not an admin at all, or an admin who did not
       create this one. Either way the write is refused by RLS by matching zero
       rows rather than by erroring, which the provider would read back as "this
       quick play was deleted". So no write may be attempted at all — not even
       from `saved`. */
    for (const status of EVERY_STATUS) {
      expect(canSave(status, false)).toBe(false);
    }
  });
});

describe("isOpening", () => {
  it("holds until the read resolves, so no blank sheet is shown as this session", () => {
    /* The sheet in memory during all three is `createQuickPlaySession()`, and
       `created_by` has not arrived either — so the session page can neither draw
       the whiteboard nor say who is allowed to change it. */
    expect(isOpening({ kind: "starting" })).toBe(true);
    expect(isOpening({ kind: "loading" })).toBe(true);
    expect(isOpening({ kind: "reloading" })).toBe(true);
  });

  it("lets the page through once a status describes this quick play", () => {
    /* Including the three that render a panel of their own rather than the
       whiteboard: they are answers about this row, not the absence of one. */
    for (const status of EVERY_STATUS) {
      if (status.kind === "starting") continue;
      if (status.kind === "loading") continue;
      if (status.kind === "reloading") continue;
      expect(isOpening(status)).toBe(false);
    }
  });

  it("never overlaps with a status that saves", () => {
    /* The two gates read the same fact from opposite ends: while none of this
       quick play is on screen, nothing can be written to it either — so the
       blank default behind an unfinished read can never reach the row. */
    for (const status of EVERY_STATUS) {
      if (!isOpening(status)) continue;
      expect(canSave(status, true)).toBe(false);
    }
  });
});

describe("the clean-sheet wipe", () => {
  it("empties the sheet and leaves it savable, so the wipe reaches Postgres", () => {
    /* A loaded session with tonight's players on it, which is the only state the
       wipe is offered from: the button rides with the status line, and that is
       rendered for the creating admin alone. */
    const loaded: DemoState = {
      tournaments: [],
      quickPlayId: "3b9d1f2a-6c4e-4f18-9a77-1d0e5c8b2a34",
      quickPlay: {
        ...createQuickPlaySession(),
        roster: [{ name: "Ana", role: "player", skill: "intermediate" }],
      },
      quickPlayDirty: true,
    };
    const status: QuickPlaySyncStatus = { kind: "saved" };

    const wiped = demoReducer(loaded, { type: "resetQuickPlay" });

    expect(wiped.quickPlay).toEqual(createQuickPlaySession());
    // Dirty and savable together are what schedule the write; either one alone
    // leaves an emptied sheet that comes back on the next reload.
    expect(wiped.quickPlayDirty).toBe(true);
    expect(canSave(status, true)).toBe(true);
  });
});
