import { describe, expect, it } from "vitest";

import type { DecisionMap, Tournament } from "@/lib/data/types";
import type { MatchSide, TournamentFormat } from "@/lib/validation/enums";

import { buildEliminationVM } from "./elimination";
import { makeEmptyTeamPlayers, makeTeams } from "./teams";
import type { EliminationVM, MatchVM } from "./types";

function makeTournament(
  teamCount: number,
  format: TournamentFormat,
  decisions: DecisionMap = {},
  courtCount = 4,
): Tournament {
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
    courtCount,
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

const TEAM_COUNTS = [4, 5, 6, 7, 8, 9, 10, 16] as const;

/** Every match a user can see, in the order the VM lays them out. */
function renderedMatches(vm: EliminationVM): MatchVM[] {
  const matches: MatchVM[] = [];
  for (const round of vm.winnersRounds) matches.push(...round.matches);
  for (const round of vm.losersRounds) matches.push(...round.matches);
  if (vm.grandFinal) matches.push(vm.grandFinal);
  return matches;
}

/** Clicks through a whole draw the way a user would: repeatedly decide the first
 *  pickable-but-undecided match in VM order until nothing is pickable. */
function playOut(
  teamCount: number,
  format: TournamentFormat,
  choose: (m: MatchVM, pickIndex: number) => MatchSide,
  courtCount = 4,
): { vm: EliminationVM; picks: number; decisions: DecisionMap } {
  const decisions: DecisionMap = {};
  const cap = 4 * teamCount + 20;
  let picks = 0;
  let vm = buildEliminationVM(
    makeTournament(teamCount, format, { ...decisions }, courtCount),
  );
  for (let i = 0; i <= cap; i++) {
    const next = renderedMatches(vm).find((m) => m.canPick && m.winner === null);
    if (!next) return { vm, picks, decisions };
    decisions[next.key] = choose(next, picks);
    picks++;
    vm = buildEliminationVM(
      makeTournament(teamCount, format, { ...decisions }, courtCount),
    );
  }
  throw new Error(
    `playOut never settled for ${teamCount} teams (${format}) within ${cap} picks`,
  );
}

/** Same walk, but only the winners bracket is decided — losers rounds stay
 *  undecided so a dropped team can only appear where the engine routed it. */
function playOutWinnersOnly(teamCount: number): EliminationVM {
  const decisions: DecisionMap = {};
  const cap = 4 * teamCount + 20;
  let vm = buildEliminationVM(makeTournament(teamCount, "double", { ...decisions }));
  for (let i = 0; i <= cap; i++) {
    const next = vm.winnersRounds
      .flatMap((r) => r.matches)
      .find((m) => m.canPick && m.winner === null);
    if (!next) return vm;
    decisions[next.key] = "a";
    vm = buildEliminationVM(makeTournament(teamCount, "double", { ...decisions }));
  }
  throw new Error(`winners bracket never settled for ${teamCount} teams`);
}

/** Raw (pre-filter) losers-round sizes implied by the winners bracket: the drop
 *  round for winners round i takes mc0 / 2^i slots and each consolation round
 *  halves that again. Void matches are the gap between this and what is
 *  rendered, which is the only way to observe them from outside the engine. */
function rawLosersCounts(vm: EliminationVM): number[] {
  const mc0 = vm.winnersRounds[0].matches.length;
  const k = vm.winnersRounds.length;
  const counts = [mc0 / 2];
  for (let i = 1; i < k; i++) {
    counts.push(mc0 / 2 ** i);
    if (i < k - 1) counts.push(mc0 / 2 ** (i + 1));
  }
  return counts;
}

/** Deterministic PRNG so a failing random walk is reproducible from its seed. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

type Strategy = {
  name: string;
  makeChoose: () => (m: MatchVM, pickIndex: number) => MatchSide;
};

const STRATEGIES: Strategy[] = [
  { name: "always a", makeChoose: () => () => "a" },
  { name: "always b", makeChoose: () => () => "b" },
  ...Array.from({ length: 20 }, (_, i) => ({
    name: `random walk seed ${i + 1}`,
    makeChoose: () => {
      const rnd = lcg(i + 1);
      return (): MatchSide => (rnd() < 0.5 ? "a" : "b");
    },
  })),
];

describe("buildEliminationVM — single elimination", () => {
  it("builds 3 rounds of 4/2/1 for 8 teams, all pickable, no byes", () => {
    const vm = buildEliminationVM(makeTournament(8, "single"));

    expect(vm.winnersRounds.map((r) => r.matches.length)).toEqual([4, 2, 1]);
    expect(vm.winnersRounds.map((r) => r.label)).toEqual([
      "Round 1 · Quarterfinals",
      "Round 2 · Semifinals",
      "Round 3 · Final",
    ]);
    expect(vm.hasLosers).toBe(false);
    expect(vm.grandFinal).toBeNull();
    expect(vm.winnersRounds[0].matches.every((m) => m.canPick)).toBe(true);
    expect(vm.winnersRounds[0].matches.every((m) => !m.a?.isBye && !m.b?.isBye)).toBe(
      true,
    );
    expect(vm.winnersRounds.every((r) => r.height === 4 * 112)).toBe(true);
  });

  it("pads 5 teams to 8 with byes in the last round-0 matches", () => {
    const vm = buildEliminationVM(makeTournament(5, "single"));
    const round0 = vm.winnersRounds[0].matches;

    expect(round0).toHaveLength(4);
    expect(round0[0].canPick).toBe(true);
    expect(round0.slice(1).every((m) => m.canPick === false)).toBe(true);
    expect(round0.slice(1).every((m) => m.b?.isBye === true)).toBe(true);
    // Teams 1 and 2 play the only real match, so Team 3 takes the first bye and
    // auto-advances.
    expect(round0[1].winner).toBe("a");
    expect(round0[1].winnerTeam?.name).toBe("Team 3");
  });

  it("cycles courts across pickable matches only", () => {
    const vm = buildEliminationVM(makeTournament(8, "single", {}, 4));
    expect(vm.winnersRounds[0].matches.map((m) => m.courtLabel)).toEqual([
      "Court 1",
      "Court 2",
      "Court 3",
      "Court 4",
    ]);
    // Round 2 is undecided, so nothing there is pickable and no court is taken.
    expect(vm.winnersRounds[1].matches.map((m) => m.court)).toEqual([1, 1]);

    const decided = buildEliminationVM(
      makeTournament(8, "single", {
        "w-0-0": "a",
        "w-0-1": "a",
        "w-0-2": "a",
        "w-0-3": "a",
      }),
    );
    expect(decided.winnersRounds[1].matches.map((m) => m.court)).toEqual([1, 2]);

    const withByes = buildEliminationVM(makeTournament(5, "single", {}, 4));
    // Only the single real round-0 match consumes a court.
    expect(withByes.winnersRounds[0].matches.map((m) => m.court)).toEqual([
      1, 2, 2, 2,
    ]);
  });

  it("advances a recorded winner into the next round", () => {
    const vm = buildEliminationVM(makeTournament(8, "single", { "w-0-0": "a" }));
    expect(vm.winnersRounds[0].matches[0].winner).toBe("a");
    expect(vm.winnersRounds[1].matches[0].a?.name).toBe("Team 1");
    expect(vm.winnersRounds[1].matches[0].aName).toBe("Team 1");
  });

  it("names a champion only once the final is decided", () => {
    expect(buildEliminationVM(makeTournament(8, "single")).championName).toBeNull();

    const decided = buildEliminationVM(
      makeTournament(8, "single", {
        "w-0-0": "a",
        "w-0-1": "a",
        "w-0-2": "a",
        "w-0-3": "a",
        "w-1-0": "a",
        "w-1-1": "a",
        "w-2-0": "b",
      }),
    );
    expect(decided.championName).toBe("Team 5");
  });
});

describe("buildEliminationVM — double elimination", () => {
  const vm = buildEliminationVM(makeTournament(8, "double"));

  it("exposes a losers bracket and a grand final", () => {
    expect(vm.hasLosers).toBe(true);
    expect(vm.losersRounds.length).toBeGreaterThan(0);
    expect(vm.grandFinal).not.toBeNull();
    expect(vm.grandFinalLabel).toMatch(/· Grand final$/);
  });

  it("pairs the WB champion against the LB champion in the grand final", () => {
    const decisions: DecisionMap = {};
    for (const round of vm.winnersRounds) {
      for (const m of round.matches) if (m.canPick) decisions[m.key] = "a";
    }
    for (const round of vm.losersRounds) {
      for (const m of round.matches) if (m.canPick) decisions[m.key] = "a";
    }
    const settled = buildEliminationVM(makeTournament(8, "double", decisions));
    const wbChampion =
      settled.winnersRounds[settled.winnersRounds.length - 1].matches[0].winnerTeam;
    const lbChampion =
      settled.losersRounds[settled.losersRounds.length - 1].matches[0].winnerTeam;

    expect(settled.grandFinal?.a?.name).toBe(wbChampion?.name);
    expect(settled.grandFinal?.b?.name).toBe(lbChampion?.name);
  });

  it("numbers play order contiguously from 1 with no duplicates", () => {
    const labels = [
      ...vm.winnersRounds.map((r) => r.label),
      ...vm.losersRounds.map((r) => r.label),
      vm.grandFinalLabel ?? "",
    ];
    const orders = labels.map((label) => {
      const match = /^Round (\d+) ·/.exec(label);
      expect(match).not.toBeNull();
      return Number(match?.[1]);
    });
    const sorted = [...orders].sort((a, b) => a - b);
    expect(new Set(orders).size).toBe(orders.length);
    expect(sorted).toEqual(Array.from({ length: orders.length }, (_, i) => i + 1));
  });
});

describe("buildEliminationVM — completability", () => {
  for (const teamCount of TEAM_COUNTS) {
    for (const format of ["single", "double"] as const) {
      const expectedPicks = format === "double" ? 2 * teamCount - 2 : teamCount - 1;

      it(`plays ${teamCount} teams (${format}) out to a champion in ${expectedPicks} picks`, () => {
        const names = makeTeams(teamCount);

        for (const strategy of STRATEGIES) {
          const { vm, picks } = playOut(
            teamCount,
            format,
            strategy.makeChoose(),
          );
          const rendered = renderedMatches(vm);

          expect(vm.championName, strategy.name).not.toBeNull();
          expect(names, strategy.name).toContain(vm.championName);
          expect(picks, strategy.name).toBe(expectedPicks);
          // Nothing is left stranded: every rendered card has a result.
          expect(
            rendered.filter((m) => m.winner === null).map((m) => m.key),
            strategy.name,
          ).toEqual([]);
          expect(
            rendered.some((m) => m.status === "void"),
            strategy.name,
          ).toBe(false);

          for (const m of rendered.filter((m) => m.status === "walkover")) {
            const aReal = m.a !== null && m.a.isBye !== true;
            const bReal = m.b !== null && m.b.isBye !== true;
            expect(aReal !== bReal, `${strategy.name} ${m.key}`).toBe(true);
            expect(m.winnerTeam?.name, `${strategy.name} ${m.key}`).toBe(
              aReal ? m.a?.name : m.b?.name,
            );
            expect(m.canPick, `${strategy.name} ${m.key}`).toBe(false);
          }
        }
      });
    }
  }
});

describe("buildEliminationVM — losers bracket structure", () => {
  /** Rendered shape per team count, plus the structural filler each draw needs.
   *  Shape is decision-independent, so it is asserted on a fresh VM. */
  const SHAPES: Record<
    number,
    {
      wb: number[];
      lb: number[];
      voids: number;
      lbWalkovers: number;
      wbByes: number;
    }
  > = {
    4: { wb: [2, 1], lb: [1, 1], voids: 0, lbWalkovers: 0, wbByes: 0 },
    5: { wb: [4, 2, 1], lb: [1, 2, 1, 1], voids: 1, lbWalkovers: 2, wbByes: 3 },
    6: { wb: [4, 2, 1], lb: [1, 2, 1, 1], voids: 1, lbWalkovers: 1, wbByes: 2 },
    7: { wb: [4, 2, 1], lb: [2, 2, 1, 1], voids: 0, lbWalkovers: 1, wbByes: 1 },
    8: { wb: [4, 2, 1], lb: [2, 2, 1, 1], voids: 0, lbWalkovers: 0, wbByes: 0 },
    9: {
      wb: [8, 4, 2, 1],
      lb: [1, 4, 2, 2, 1, 1],
      voids: 3,
      lbWalkovers: 4,
      wbByes: 7,
    },
    10: {
      wb: [8, 4, 2, 1],
      lb: [1, 4, 2, 2, 1, 1],
      voids: 3,
      lbWalkovers: 3,
      wbByes: 6,
    },
    16: {
      wb: [8, 4, 2, 1],
      lb: [4, 4, 2, 2, 1, 1],
      voids: 0,
      lbWalkovers: 0,
      wbByes: 0,
    },
  };

  const sum = (ns: number[]) => ns.reduce((total, x) => total + x, 0);

  for (const teamCount of TEAM_COUNTS) {
    const shape = SHAPES[teamCount];

    it(`renders ${shape.lb.join("/")} losers matches for ${teamCount} teams`, () => {
      const vm = buildEliminationVM(makeTournament(teamCount, "double"));

      expect(vm.winnersRounds.map((r) => r.matches.length)).toEqual(shape.wb);
      expect(vm.losersRounds.map((r) => r.matches.length)).toEqual(shape.lb);
      expect(vm.losersRounds.length).toBe(2 * vm.winnersRounds.length - 2);
      // Voids are filtered out of the VM, so they show up as the gap between the
      // sizes the algorithm generates and the sizes it renders.
      expect(sum(rawLosersCounts(vm)) - sum(shape.lb)).toBe(shape.voids);
    });

    it(`counts ${shape.wbByes} winners byes and ${shape.lbWalkovers} losers walkovers for ${teamCount} teams`, () => {
      const { vm } = playOut(teamCount, "double", () => "a");
      const wbWalkovers = vm.winnersRounds
        .flatMap((r) => r.matches)
        .filter((m) => m.status === "walkover");
      const lbWalkovers = vm.losersRounds
        .flatMap((r) => r.matches)
        .filter((m) => m.status === "walkover");

      expect(wbWalkovers).toHaveLength(shape.wbByes);
      expect(wbWalkovers.every((m) => m.key.startsWith("w-0-"))).toBe(true);
      expect(lbWalkovers).toHaveLength(shape.lbWalkovers);
    });

    it(`drops each winners-round loser into the round below it (${teamCount} teams)`, () => {
      const vm = playOutWinnersOnly(teamCount);
      const lbNames = vm.losersRounds.map(
        (r) => new Set(r.matches.flatMap((m) => [m.aName, m.bName])),
      );

      vm.winnersRounds.forEach((round, i) => {
        const losers = round.matches
          .filter(
            (m) =>
              m.winner !== null &&
              m.a !== null &&
              m.b !== null &&
              m.a.isBye !== true &&
              m.b.isBye !== true,
          )
          .map((m) => (m.winner === "a" ? m.b : m.a));
        const expectedRound = i === 0 ? 0 : 2 * i - 1;

        for (const loser of losers) {
          const name = loser?.name ?? "";
          const firstSeen = lbNames.findIndex((names) => names.has(name));
          expect(firstSeen, `${name} lost winners round ${i}`).toBe(expectedRound);
        }
      });
    });

    it(`never lists a team twice within one round (${teamCount} teams)`, () => {
      const { vm } = playOut(teamCount, "double", () => "a");

      for (const round of [...vm.winnersRounds, ...vm.losersRounds]) {
        const names = round.matches
          .flatMap((m) => [m.aName, m.bName])
          .filter((name) => name !== "Bye" && name !== "TBD");
        expect(new Set(names).size, round.label).toBe(names.length);
      }
    });

    it(`pairs both bracket champions in the grand final (${teamCount} teams)`, () => {
      const { vm } = playOut(teamCount, "double", () => "a");
      const wbFinal = vm.winnersRounds[vm.winnersRounds.length - 1].matches[0];
      const lbFinal = vm.losersRounds[vm.losersRounds.length - 1].matches[0];

      expect(vm.grandFinal?.status).toBe("playable");
      expect(vm.grandFinal?.a?.name).toBe(wbFinal.winnerTeam?.name);
      expect(vm.grandFinal?.b?.name).toBe(lbFinal.winnerTeam?.name);
      expect(vm.grandFinal?.a?.isBye).toBeUndefined();
      expect(vm.grandFinal?.b?.isBye).toBeUndefined();
    });
  }
});

describe("buildEliminationVM — powers of two are unchanged", () => {
  const EXPECTED_PICKS: Record<number, number> = { 4: 6, 8: 14, 16: 30 };

  for (const teamCount of [4, 8, 16]) {
    it(`has no walkovers or voids for ${teamCount} teams`, () => {
      const fresh = buildEliminationVM(makeTournament(teamCount, "double"));
      const { vm, picks } = playOut(teamCount, "double", () => "a");

      for (const built of [fresh, vm]) {
        for (const m of renderedMatches(built)) {
          expect(["playable", "pending"], m.key).toContain(m.status);
        }
      }
      expect(picks).toBe(EXPECTED_PICKS[teamCount]);

      const wbHeight = fresh.winnersRounds[0].matches.length * 112;
      const lbHeight = fresh.losersRounds[0].matches.length * 112;
      expect(fresh.winnersRounds.every((r) => r.height === wbHeight)).toBe(true);
      expect(fresh.losersRounds.every((r) => r.height === lbHeight)).toBe(true);
    });
  }
});

describe("buildEliminationVM — courts with walkovers present", () => {
  for (const teamCount of [5, 9]) {
    it(`cycles courts 1..4 across pickable matches only (${teamCount} teams)`, () => {
      const { vm } = playOut(teamCount, "double", () => "a", 4);
      const rendered = renderedMatches(vm);
      const pickable = rendered.filter((m) => m.canPick);

      expect(pickable.map((m) => m.court)).toEqual(
        pickable.map((_, i) => (i % 4) + 1),
      );

      // A walkover or pending card reserves no court: it shows whichever court
      // the next real match is about to take.
      rendered.forEach((m, i) => {
        if (m.canPick) return;
        const next = rendered.slice(i + 1).find((other) => other.canPick);
        expect(next, m.key).toBeDefined();
        expect(m.court, m.key).toBe(next?.court);
      });
    });
  }
});
