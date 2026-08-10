import { describe, expect, it } from "vitest";

import type { Tournament } from "@/lib/data/types";
import { buildEliminationVM } from "@/lib/tournament/elimination";
import { makeEmptyTeamPlayers, makeTeams } from "@/lib/tournament/teams";
import type { EliminationVM, RoundVM } from "@/lib/tournament/types";
import type { TournamentFormat } from "@/lib/validation/enums";

import { layoutSection } from "./bracket-layout";
import type { MatchPlacement } from "./bracket-layout";

function makeTournament(teamCount: number, format: TournamentFormat): Tournament {
  return {
    id: "test",
    name: "Test",
    dates: "Jan 1",
    location: "Test hall",
    level: "All levels",
    divisions: "Singles",
    description: "",
    format,
    teamCount,
    courtCount: 4,
    playType: "singles",
    matchMinutes: 30,
    sessionMinutes: 240,
    teams: makeTeams(teamCount),
    teamPlayers: makeEmptyTeamPlayers(teamCount),
    decisions: {},
    roster: [],
    assignedPlayerNames: [],
  };
}

const TEAM_COUNTS = [4, 5, 6, 7, 8, 9, 10, 16] as const;

/** The two sections exactly as `EliminationBracket` composes them: the grand
 *  final is the winners section's last column. */
function winnersSection(vm: EliminationVM): RoundVM[] {
  return vm.grandFinal
    ? [
        ...vm.winnersRounds,
        { label: vm.grandFinalLabel ?? "Grand final", matches: [vm.grandFinal] },
      ]
    : vm.winnersRounds;
}

function sectionsOf(teamCount: number, format: TournamentFormat): RoundVM[][] {
  const vm = buildEliminationVM(makeTournament(teamCount, format));
  return vm.hasLosers
    ? [winnersSection(vm), vm.losersRounds]
    : [winnersSection(vm)];
}

describe("layoutSection — 8-team double elimination", () => {
  const [winners, losers] = sectionsOf(8, "double");

  it("stacks the winners bracket into 4 columns of 4 leaf rows", () => {
    const layout = layoutSection(winners);
    const at = (key: string) => layout.placements.get(key);

    expect(layout.columns).toBe(4);
    expect(layout.rows).toBe(4);

    for (const i of [0, 1, 2, 3]) {
      expect(at(`w-0-${i}`)?.rowStart, `w-0-${i}`).toBe(i + 1);
      expect(at(`w-0-${i}`)?.rowSpan, `w-0-${i}`).toBe(1);
      expect(at(`w-0-${i}`)?.hasIncoming, `w-0-${i}`).toBe(false);
      expect(at(`w-0-${i}`)?.hasOutgoing, `w-0-${i}`).toBe(true);
    }

    expect(at("w-1-0")).toMatchObject({
      column: 2,
      rowStart: 1,
      rowSpan: 2,
      cardCentrePct: 50,
      riserTopPct: 25,
      riserHeightPct: 50,
    });
    expect(at("w-1-1")).toMatchObject({
      column: 2,
      rowStart: 3,
      rowSpan: 2,
      cardCentrePct: 50,
      riserTopPct: 25,
      riserHeightPct: 50,
    });
    expect(at("w-2-0")).toMatchObject({
      column: 3,
      rowStart: 1,
      rowSpan: 4,
      riserTopPct: 25,
      riserHeightPct: 50,
      hasOutgoing: true,
    });
  });

  it("gives the grand final a straight line from the winners final", () => {
    const gf = layoutSection(winners).placements.get("gf");

    expect(gf).toMatchObject({
      column: 4,
      rowStart: 1,
      rowSpan: 4,
      cardCentrePct: 50,
      // Its other slot comes from the losers final, which is a different
      // section — that edge is a label, not a line.
      riserTopPct: null,
      riserHeightPct: null,
      hasIncoming: true,
      hasOutgoing: false,
    });
  });

  it("stacks the losers bracket into 4 columns of 2 leaf rows", () => {
    const layout = layoutSection(losers);
    const at = (key: string) => layout.placements.get(key);

    expect(layout.columns).toBe(4);
    expect(layout.rows).toBe(2);

    expect(at("l-0-0")).toMatchObject({ rowStart: 1, rowSpan: 1, hasIncoming: false });
    expect(at("l-0-1")).toMatchObject({ rowStart: 2, rowSpan: 1, hasIncoming: false });
    // Drop rounds take one in-section feeder straight across.
    expect(at("l-1-0")).toMatchObject({ rowStart: 1, rowSpan: 1, riserTopPct: null });
    expect(at("l-1-1")).toMatchObject({ rowStart: 2, rowSpan: 1, riserTopPct: null });
    expect(at("l-2-0")).toMatchObject({
      rowStart: 1,
      rowSpan: 2,
      cardCentrePct: 50,
      riserTopPct: 25,
      riserHeightPct: 50,
    });
    expect(at("l-3-0")).toMatchObject({
      rowStart: 1,
      rowSpan: 2,
      riserTopPct: null,
      hasIncoming: true,
      // Its edge to the grand final crosses sections, so nothing is drawn.
      hasOutgoing: false,
    });
  });
});

describe("layoutSection — 16-team double elimination", () => {
  const [winners, losers] = sectionsOf(16, "double");

  it("sizes both grids from the rounds alone", () => {
    expect(layoutSection(winners)).toMatchObject({ columns: 5, rows: 8 });
    expect(layoutSection(losers)).toMatchObject({ columns: 6, rows: 4 });
  });
});

describe("layoutSection — every draw lays out cleanly", () => {
  for (const teamCount of TEAM_COUNTS) {
    for (const format of ["single", "double"] as const) {
      it(`never overlaps or overflows (${teamCount} teams, ${format})`, () => {
        for (const rounds of sectionsOf(teamCount, format)) {
          const layout = layoutSection(rounds);
          const byColumn = new Map<number, MatchPlacement[]>();

          for (const placement of layout.placements.values()) {
            expect(placement.rowStart, placement.key).toBeGreaterThanOrEqual(1);
            expect(
              placement.rowStart + placement.rowSpan - 1,
              placement.key,
            ).toBeLessThanOrEqual(layout.rows);
            const column = byColumn.get(placement.column) ?? [];
            column.push(placement);
            byColumn.set(placement.column, column);
          }

          for (const [column, placements] of byColumn) {
            placements.forEach((placement, i) => {
              const previous = placements[i - 1];
              if (!previous) return;
              // DOM order within a column is also visual order, and the rows
              // two cards occupy never intersect.
              expect(placement.rowStart, `column ${column}`).toBeGreaterThanOrEqual(
                previous.rowStart + previous.rowSpan,
              );
            });
          }

          const last = layout.placements.get(
            rounds[rounds.length - 1].matches[0].key,
          );
          expect(rounds[rounds.length - 1].matches).toHaveLength(1);
          expect(last).toMatchObject({ rowStart: 1, rowSpan: layout.rows });
        }
      });
    }
  }
});
