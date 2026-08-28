import { describe, expect, it } from "vitest";

import { toQuickPlaySummary } from "./session-list";

/* Only the seven columns `QUICK_PLAY_LIST_COLUMNS` asks for come back for a
   list — the sheet itself is never fetched to render a card. */
function listRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "3b9d1f2a-6c4e-4f18-9a77-1d0e5c8b2a34",
    title: "Tuesday club night",
    format: "double",
    team_count: 8,
    roster: [
      { name: "Ana", role: "player", skill: "intermediate" },
      { name: "Ben", role: "player", skill: "beginner" },
    ],
    updated_at: "2026-08-20T10:05:00.000Z",
    created_by: "6f1d5f6e-4a1b-4c2e-8f11-0b3c9d2e7a55",
    ...overrides,
  };
}

describe("toQuickPlaySummary", () => {
  it("keeps the card's fields and counts the roster rather than carrying it", () => {
    expect(toQuickPlaySummary(listRow())).toEqual({
      id: "3b9d1f2a-6c4e-4f18-9a77-1d0e5c8b2a34",
      title: "Tuesday club night",
      format: "double",
      teamCount: 8,
      playerCount: 2,
      updatedAt: "2026-08-20T10:05:00.000Z",
      createdBy: "6f1d5f6e-4a1b-4c2e-8f11-0b3c9d2e7a55",
    });
  });

  it("still lists a row that has no creator", () => {
    // A row from before the creator-ownership migration. It lists like any
    // other and simply offers nobody a Delete — dropping it would hide a quick
    // play the club can still open and read.
    expect(toQuickPlaySummary(listRow({ created_by: null }))?.createdBy).toBeNull();
  });

  it("rejects a creator id that could never name an account", () => {
    expect(toQuickPlaySummary(listRow({ created_by: "nobody" }))).toBeNull();
  });

  it("rejects a format the label helper does not know", () => {
    expect(toQuickPlaySummary(listRow({ format: "knockout" }))).toBeNull();
  });

  it("rejects an unsupported team count", () => {
    expect(toQuickPlaySummary(listRow({ team_count: 12 }))).toBeNull();
  });

  it("rejects a missing or unusable title", () => {
    expect(toQuickPlaySummary(listRow({ title: undefined }))).toBeNull();
    expect(toQuickPlaySummary(listRow({ title: " " }))).toBeNull();
  });

  it("rejects an id that could never name a row", () => {
    expect(toQuickPlaySummary(listRow({ id: "quick-play" }))).toBeNull();
  });

  it("rejects anything that is not a row at all", () => {
    expect(toQuickPlaySummary(undefined)).toBeNull();
    expect(toQuickPlaySummary(null)).toBeNull();
    expect(toQuickPlaySummary({})).toBeNull();
  });
});
