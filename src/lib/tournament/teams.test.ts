import { describe, expect, it } from "vitest";

import type { Tournament } from "@/lib/data/types";

import {
  getCapacity,
  getRemainingPool,
  hasEmptySlot,
  makeEmptyTeamPlayers,
  makeTeams,
  resizeTeams,
  teamDisplayName,
} from "./teams";

function makeTournament(overrides: Partial<Tournament> = {}): Tournament {
  return {
    id: "test",
    name: "Test",
    dates: "Jan 1",
    location: "Test hall",
    level: "All levels",
    divisions: "Singles",
    description: "",
    format: "single",
    teamCount: 4,
    courtCount: 2,
    playType: "doubles",
    matchMinutes: 30,
    sessionMinutes: 240,
    teams: makeTeams(4),
    teamPlayers: makeEmptyTeamPlayers(4),
    decisions: {},
    roster: [
      { name: "Ana", role: "player", skill: "beginner" },
      { name: "Ben", role: "player", skill: "advanced" },
    ],
    assignedPlayerNames: [],
    ...overrides,
  };
}

describe("resizeTeams", () => {
  it("appends default names when growing", () => {
    expect(resizeTeams(["Ana / Ben", "Team 2"], 4)).toEqual([
      "Ana / Ben",
      "Team 2",
      "Team 3",
      "Team 4",
    ]);
  });

  it("truncates when shrinking", () => {
    expect(resizeTeams(makeTeams(8), 3)).toEqual(["Team 1", "Team 2", "Team 3"]);
  });
});

describe("getCapacity", () => {
  it("pairs players up for doubles only", () => {
    expect(getCapacity("doubles")).toBe(2);
    expect(getCapacity("singles")).toBe(1);
  });
});

describe("teamDisplayName", () => {
  it("joins assigned players and falls back to the team number", () => {
    expect(teamDisplayName(["Ana", "Ben"], 0)).toBe("Ana / Ben");
    expect(teamDisplayName(["Ana"], 2)).toBe("Ana");
    expect(teamDisplayName([], 2)).toBe("Team 3");
  });
});

describe("getRemainingPool", () => {
  it("excludes players already assigned to a team", () => {
    expect(getRemainingPool(makeTournament())).toEqual(["Ana", "Ben"]);
    expect(
      getRemainingPool(makeTournament({ assignedPlayerNames: ["Ana"] })),
    ).toEqual(["Ben"]);
  });
});

describe("hasEmptySlot", () => {
  it("is false only when every team is at capacity", () => {
    expect(hasEmptySlot(makeTournament())).toBe(true);
    expect(
      hasEmptySlot(
        makeTournament({
          teamCount: 1,
          teams: ["Ana / Ben"],
          teamPlayers: [["Ana", "Ben"]],
        }),
      ),
    ).toBe(false);
  });
});
