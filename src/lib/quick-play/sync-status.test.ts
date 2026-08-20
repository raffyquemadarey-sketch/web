import { describe, expect, it } from "vitest";

import { createQuickPlaySession } from "@/lib/demo/quick-play";
import { demoReducer } from "@/lib/demo/reducer";
import type { DemoState } from "@/lib/demo/reducer";

import { canSave, clearConflict } from "./sync-status";
import type { QuickPlaySyncStatus } from "./sync-status";

const EVERY_STATUS: QuickPlaySyncStatus[] = [
  { kind: "starting" },
  { kind: "off" },
  { kind: "loading" },
  { kind: "idle" },
  { kind: "saving" },
  { kind: "saved" },
  { kind: "conflict" },
  { kind: "missing" },
  { kind: "error", message: "network unreachable" },
];

describe("canSave", () => {
  it("holds steady across a write, so the save effect cannot re-trigger itself", () => {
    // The dependency the save effect watches. If starting or finishing a write
    // changed this, every save would schedule the next one.
    expect(canSave({ kind: "saving" })).toBe(true);
    expect(canSave({ kind: "saved" })).toBe(true);
    expect(canSave({ kind: "idle" })).toBe(true);
  });

  it("refuses to write while a saved sheet is unresolved", () => {
    expect(canSave({ kind: "conflict" })).toBe(false);
  });

  it("refuses to write before anything has loaded, or when nothing can", () => {
    expect(canSave({ kind: "starting" })).toBe(false);
    expect(canSave({ kind: "loading" })).toBe(false);
    expect(canSave({ kind: "off" })).toBe(false);
    expect(canSave({ kind: "missing" })).toBe(false);
  });

  it("retries after a failure, because the next change is the retry", () => {
    expect(canSave({ kind: "error", message: "network unreachable" })).toBe(true);
  });
});

describe("clearConflict", () => {
  it("moves a conflicted tab back into a status that saves", () => {
    const resolved = clearConflict({ kind: "conflict" });

    expect(resolved).toEqual({ kind: "idle" });
    expect(canSave(resolved)).toBe(true);
  });

  it("returns the same object for every other status, so React bails out", () => {
    for (const status of EVERY_STATUS) {
      if (status.kind === "conflict") continue;
      expect(clearConflict(status)).toBe(status);
    }
  });
});

describe("the clean-sheet exit from conflict", () => {
  it("empties the sheet and leaves it savable, so the wipe reaches Postgres", () => {
    /* The state a tab is in once a saved row arrived too late: work of its own
       on the whiteboard, and saving stopped to protect the saved sheet. */
    const conflicted: DemoState = {
      tournaments: [],
      quickPlayId: "3b9d1f2a-6c4e-4f18-9a77-1d0e5c8b2a34",
      quickPlay: {
        ...createQuickPlaySession(),
        roster: [{ name: "Ana", role: "player", skill: "intermediate" }],
      },
      quickPlayDirty: true,
    };
    const status: QuickPlaySyncStatus = { kind: "conflict" };
    expect(canSave(status)).toBe(false);

    // Both halves of one click: `resetQuickPlay` from the reducer,
    // `resolveConflict` — which is `setStatus(clearConflict)` — from the sync
    // provider.
    const wiped = demoReducer(conflicted, { type: "resetQuickPlay" });
    const resolved = clearConflict(status);

    expect(wiped.quickPlay).toEqual(createQuickPlaySession());
    // Dirty and savable together are what schedule the write; either one alone
    // is the dead control this replaced.
    expect(wiped.quickPlayDirty).toBe(true);
    expect(canSave(resolved)).toBe(true);
  });
});
