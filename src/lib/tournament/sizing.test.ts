import { describe, expect, it } from "vitest";

import {
  describeRosterFit,
  describeSuggestion,
  getRosterFit,
  suggestTeamCount,
} from "./sizing";

describe("suggestTeamCount", () => {
  it("clamps an empty roster up to the smallest supported size", () => {
    const s = suggestTeamCount(0, "doubles");
    expect(s).toEqual({
      playerCount: 0,
      capacity: 2,
      ideal: 0,
      suggested: 4,
      clamp: "min",
    });
  });

  it("clamps a single player up, whichever the play type", () => {
    expect(suggestTeamCount(1, "singles")).toMatchObject({
      ideal: 1,
      suggested: 4,
      clamp: "min",
    });
    expect(suggestTeamCount(1, "doubles")).toMatchObject({
      ideal: 1,
      suggested: 4,
      clamp: "min",
    });
  });

  it("rounds an odd doubles roster up so nobody is left out", () => {
    expect(suggestTeamCount(7, "doubles")).toMatchObject({
      capacity: 2,
      ideal: 4,
      suggested: 4,
      clamp: "none",
    });
  });

  it("takes the exact size when the ideal is itself supported", () => {
    expect(suggestTeamCount(12, "doubles")).toMatchObject({
      ideal: 6,
      suggested: 6,
      clamp: "none",
    });
  });

  it("rounds up to the next supported size when the ideal is not one", () => {
    expect(suggestTeamCount(11, "singles")).toMatchObject({
      ideal: 11,
      suggested: 16,
      clamp: "rounded",
    });
  });

  it("clamps down to the largest supported size", () => {
    expect(suggestTeamCount(40, "singles")).toMatchObject({
      ideal: 40,
      suggested: 16,
      clamp: "max",
    });
  });

  it("treats negative and non-finite counts as an empty roster", () => {
    expect(suggestTeamCount(-5, "doubles")).toMatchObject({
      playerCount: 0,
      ideal: 0,
    });
    expect(suggestTeamCount(Number.NaN, "singles")).toMatchObject({
      playerCount: 0,
      ideal: 0,
    });
  });
});

describe("getRosterFit", () => {
  it("reports a full roster as balanced", () => {
    expect(
      getRosterFit({ playerCount: 16, playType: "doubles", teamCount: 8 }),
    ).toMatchObject({
      slots: 16,
      emptySlots: 0,
      unplacedPlayers: 0,
      status: "balanced",
    });
  });

  it("reports leftover slots as underfilled", () => {
    expect(
      getRosterFit({ playerCount: 7, playType: "doubles", teamCount: 4 }),
    ).toMatchObject({
      slots: 8,
      emptySlots: 1,
      unplacedPlayers: 0,
      status: "underfilled",
    });
  });

  it("reports players with nowhere to go as overfilled", () => {
    expect(
      getRosterFit({ playerCount: 16, playType: "doubles", teamCount: 4 }),
    ).toMatchObject({
      slots: 8,
      emptySlots: 0,
      unplacedPlayers: 8,
      status: "overfilled",
    });
  });

  it("reports an empty roster as empty, not underfilled", () => {
    expect(
      getRosterFit({ playerCount: 0, playType: "doubles", teamCount: 8 }),
    ).toMatchObject({ slots: 16, emptySlots: 16, status: "empty" });
  });
});

describe("describeRosterFit", () => {
  const sentence = (
    playerCount: number,
    playType: "singles" | "doubles",
    teamCount: number,
  ) => describeRosterFit(getRosterFit({ playerCount, playType, teamCount }));

  it("names the roster the empty draw is waiting for", () => {
    expect(sentence(0, "doubles", 8)).toBe(
      "No players have registered yet. 8 doubles teams will need 16 players.",
    );
  });

  it("confirms an exact fit", () => {
    expect(sentence(16, "doubles", 8)).toBe(
      "16 players, doubles — exactly fills 8 teams of 2.",
    );
  });

  it("counts the slots that will stay empty", () => {
    expect(sentence(3, "doubles", 8)).toBe(
      "8 teams of 2 needs 16 players. 3 have registered, so 13 slots will stay empty.",
    );
  });

  it("counts the players who have no place", () => {
    expect(sentence(16, "doubles", 4)).toBe(
      "16 players won't fit in 4 doubles teams (8 slots) — 8 players have no place.",
    );
  });
});

describe("describeSuggestion", () => {
  it("says nothing about a roster nobody has joined", () => {
    expect(describeSuggestion(suggestTeamCount(0, "doubles"))).toBeNull();
  });

  it("states a supported ideal plainly", () => {
    expect(describeSuggestion(suggestTeamCount(12, "doubles"))).toBe(
      "Suggested: 6 teams.",
    );
  });

  it("explains a clamp to the smallest size", () => {
    expect(describeSuggestion(suggestTeamCount(1, "doubles"))).toBe(
      "Suggested: 4 teams — the fewest supported.",
    );
  });

  it("explains a clamp to the largest size", () => {
    expect(describeSuggestion(suggestTeamCount(40, "singles"))).toBe(
      "Suggested: 16 teams — the most supported.",
    );
  });

  it("explains rounding to the next supported size", () => {
    expect(describeSuggestion(suggestTeamCount(11, "singles"))).toBe(
      "Suggested: 16 teams — 11 isn't a supported size.",
    );
  });
});
