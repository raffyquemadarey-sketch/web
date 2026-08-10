import { describe, expect, it } from "vitest";

import type { DecisionMap, Tournament } from "@/lib/data/types";

import { buildRoundRobinVM } from "./round-robin";
import { makeEmptyTeamPlayers, makeTeams } from "./teams";

function makeTournament(teamCount: number, decisions: DecisionMap = {}): Tournament {
  return {
    id: "test",
    name: "Test",
    dates: "Jan 1",
    location: "Test hall",
    level: "All levels",
    divisions: "Singles",
    description: "",
    format: "roundrobin",
    teamCount,
    courtCount: 2,
    playType: "singles",
    matchMinutes: 30,
    sessionMinutes: 240,
    teams: makeTeams(teamCount),
    teamPlayers: makeEmptyTeamPlayers(teamCount),
    decisions,
    roster: [],
    assignedPlayerNames: [],
  };
}

describe("buildRoundRobinVM", () => {
  it("schedules 4 teams as 3 rounds of 2 unique pairings", () => {
    const vm = buildRoundRobinVM(makeTournament(4));

    expect(vm.scheduleRounds).toHaveLength(3);
    expect(vm.scheduleRounds.map((r) => r.matches.length)).toEqual([2, 2, 2]);
    expect(vm.scheduleRounds.map((r) => r.label)).toEqual([
      "Round 1",
      "Round 2",
      "Round 3",
    ]);

    const keys = vm.matches.map((m) => m.key);
    expect(new Set(keys).size).toBe(6);
    expect([...keys].sort()).toEqual([
      "rr-0-1",
      "rr-0-2",
      "rr-0-3",
      "rr-1-2",
      "rr-1-3",
      "rr-2-3",
    ]);
    // Side `a` is always the lower team index.
    expect(vm.matches.every((m) => m.a.idx < m.b.idx)).toBe(true);
  });

  it("skips the bye for an odd team count", () => {
    const vm = buildRoundRobinVM(makeTournament(5));
    expect(vm.scheduleRounds).toHaveLength(5);
    expect(vm.scheduleRounds.map((r) => r.matches.length)).toEqual([2, 2, 2, 2, 2]);
    expect(new Set(vm.matches.map((m) => m.key)).size).toBe(10);
  });

  it("cycles courts on every match", () => {
    const vm = buildRoundRobinVM(makeTournament(4));
    expect(vm.matches.map((m) => m.court)).toEqual([1, 2, 1, 2, 1, 2]);
  });

  it("ranks standings by wins, then losses, then name", () => {
    const vm = buildRoundRobinVM(
      makeTournament(4, { "rr-0-1": "a", "rr-0-2": "a", "rr-2-3": "a" }),
    );

    expect(vm.standings.map((row) => row.name)).toEqual([
      "Team 1",
      "Team 3",
      "Team 2",
      "Team 4",
    ]);
    expect(vm.standings.map((row) => row.rank)).toEqual([1, 2, 3, 4]);
    expect(vm.standings[0].record).toBe("2–0");
    expect(vm.standings[3].record).toBe("0–1");
  });
});
