import { describe, expect, it } from "vitest";

import type { Tournament } from "@/lib/data/types";

import {
  isDuplicatePlayerName,
  makePlayerEntry,
  normalisePlayerName,
  removePlayer,
} from "./roster";
import { makeEmptyTeamPlayers, makeTeams } from "./teams";

function makeTournament(overrides: Partial<Tournament> = {}): Tournament {
  return {
    id: "test",
    name: "Test",
    startDate: "2026-01-01",
    endDate: null,
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

describe("normalisePlayerName", () => {
  it("trims and collapses internal whitespace", () => {
    expect(normalisePlayerName("  Ana  ")).toBe("Ana");
    expect(normalisePlayerName("Jordan   Lee")).toBe("Jordan Lee");
    expect(normalisePlayerName("\tJordan \n Lee ")).toBe("Jordan Lee");
  });
});

describe("isDuplicatePlayerName", () => {
  it("ignores case and surrounding whitespace", () => {
    expect(isDuplicatePlayerName(["Ana"], " ana ")).toBe(true);
    expect(isDuplicatePlayerName(["Jordan Lee"], "jordan   lee")).toBe(true);
  });

  it("treats a different name as new", () => {
    expect(isDuplicatePlayerName(["Ana"], "Ana B")).toBe(false);
    expect(isDuplicatePlayerName([], "Ana")).toBe(false);
  });
});

describe("makePlayerEntry", () => {
  it("normalises the name and fills the required role and skill", () => {
    expect(makePlayerEntry("  Jordan   Lee ")).toEqual({
      name: "Jordan Lee",
      role: "player",
      skill: "intermediate",
    });
  });
});

describe("removePlayer", () => {
  const assigned = () =>
    makeTournament({
      roster: [
        { name: "Ana", role: "player", skill: "beginner" },
        { name: "Ben", role: "player", skill: "advanced" },
      ],
      teams: ["Ana / Ben", "The Smashers", "Team 3", "Team 4"],
      teamPlayers: [["Ana", "Ben"], [], [], []],
      assignedPlayerNames: ["Ana", "Ben"],
      decisions: { "w-0-0": "a" },
    });

  it("drops the player from the roster, the pool and their team", () => {
    const next = removePlayer(assigned(), "Ana");
    expect(next.roster.map((p) => p.name)).toEqual(["Ben"]);
    expect(next.assignedPlayerNames).toEqual(["Ben"]);
    expect(next.teamPlayers).toEqual([["Ben"], [], [], []]);
  });

  it("renames only the team that changed", () => {
    const next = removePlayer(assigned(), "Ben");
    expect(next.teams).toEqual(["Ana", "The Smashers", "Team 3", "Team 4"]);
  });

  it("reverts an emptied team to its numbered name", () => {
    const next = removePlayer(
      makeTournament({
        roster: [{ name: "Ana", role: "player", skill: "beginner" }],
        teams: ["Team 1", "Ana", "Team 3", "Team 4"],
        teamPlayers: [[], ["Ana"], [], []],
        assignedPlayerNames: ["Ana"],
      }),
      "Ana",
    );
    expect(next.teams).toEqual(["Team 1", "Team 2", "Team 3", "Team 4"]);
  });

  it("leaves recorded results alone", () => {
    expect(removePlayer(assigned(), "Ana")).not.toHaveProperty("decisions");
  });

  it("is a no-op for a name nobody has", () => {
    const t = assigned();
    const next = removePlayer(t, "Nobody");
    expect(next.roster).toEqual(t.roster);
    expect(next.teams).toEqual(t.teams);
    expect(next.teamPlayers).toEqual(t.teamPlayers);
    expect(next.assignedPlayerNames).toEqual(t.assignedPlayerNames);
  });
});
