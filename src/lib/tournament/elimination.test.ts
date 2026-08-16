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
    startDate: "2026-01-01",
    endDate: null,
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

/** Every rendered match, addressable by the key the engine gives it. */
function byKey(vm: EliminationVM): Map<string, MatchVM> {
  return new Map(renderedMatches(vm).map((m) => [m.key, m]));
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
 *  halves that again. `mc0` comes from the team count rather than the VM because
 *  the VM's first winners round is filtered. Hidden byes are the gap between
 *  this and what is rendered, which is the only way to observe them from
 *  outside the engine. */
function rawLosersCounts(teamCount: number, vm: EliminationVM): number[] {
  const mc0 = 2 ** Math.ceil(Math.log2(teamCount)) / 2;
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
  });

  it("pads 5 teams to 8 without showing a card for any bye", () => {
    const vm = buildEliminationVM(makeTournament(5, "single"));
    const round0 = vm.winnersRounds[0].matches;

    // Teams 1 and 2 play the only real opening match; teams 3, 4 and 5 draw byes
    // and get no card of their own.
    expect(round0).toHaveLength(1);
    expect(round0[0].key).toBe("w-0-0");
    expect(round0[0].canPick).toBe(true);
    expect(vm.winnersRounds[0].label).toBe("Round 1 · Quarterfinals");

    // The bye teams are visible where they landed instead.
    expect(vm.winnersRounds[1].matches[0].bName).toBe("Team 3");
    expect(vm.winnersRounds[1].matches[1].key).toBe("w-1-1");
    expect(vm.winnersRounds[1].matches[1].status).toBe("playable");
    expect(vm.winnersRounds[1].matches[1].aName).toBe("Team 4");
    expect(vm.winnersRounds[1].matches[1].bName).toBe("Team 5");
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
    // Only the single real round-0 match survives the bye filter, and it takes
    // the first court.
    expect(withByes.winnersRounds[0].matches.map((m) => m.court)).toEqual([1]);
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

  for (const teamCount of TEAM_COUNTS) {
    it(`numbers play order contiguously from 1 with no duplicates (${teamCount} teams)`, () => {
      const built = buildEliminationVM(makeTournament(teamCount, "double"));
      const labels = [
        ...built.winnersRounds.map((r) => r.label),
        ...built.losersRounds.map((r) => r.label),
        built.grandFinalLabel ?? "",
      ];
      const orders = labels.map((label) => {
        const match = /^Round (\d+) ·/.exec(label);
        expect(match, label).not.toBeNull();
        return Number(match?.[1]);
      });
      const sorted = [...orders].sort((a, b) => a - b);
      expect(new Set(orders).size).toBe(orders.length);
      expect(sorted).toEqual(Array.from({ length: orders.length }, (_, i) => i + 1));

      // A dropped losers round must not leave a gap in the "Losers N" suffixes
      // either.
      expect(built.losersRounds.map((r) => r.label.replace(/^Round \d+ · /, ""))).toEqual(
        built.losersRounds.map((_, i) => `Losers ${i + 1}`),
      );
    });
  }
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
  /** Rendered shape per team count. Only contested matches make the sheet, so a
   *  bye costs a card and a losers round that is nothing but byes is dropped
   *  entirely (5 and 9 teams lose their first). `hiddenWB` / `hiddenLB` are the
   *  gap between what the algorithm generates and what it renders, which is the
   *  only way to observe the filler from outside the engine. Shape is
   *  decision-independent, so it is asserted on a fresh VM. */
  const SHAPES: Record<
    number,
    { wb: number[]; lb: number[]; hiddenWB: number; hiddenLB: number }
  > = {
    4: { wb: [2, 1], lb: [1, 1], hiddenWB: 0, hiddenLB: 0 },
    5: { wb: [1, 2, 1], lb: [1, 1, 1], hiddenWB: 3, hiddenLB: 3 },
    6: { wb: [2, 2, 1], lb: [1, 1, 1, 1], hiddenWB: 2, hiddenLB: 2 },
    7: { wb: [3, 2, 1], lb: [1, 2, 1, 1], hiddenWB: 1, hiddenLB: 1 },
    8: { wb: [4, 2, 1], lb: [2, 2, 1, 1], hiddenWB: 0, hiddenLB: 0 },
    9: { wb: [1, 4, 2, 1], lb: [1, 2, 2, 1, 1], hiddenWB: 7, hiddenLB: 7 },
    10: { wb: [2, 4, 2, 1], lb: [1, 1, 2, 2, 1, 1], hiddenWB: 6, hiddenLB: 6 },
    16: { wb: [8, 4, 2, 1], lb: [4, 4, 2, 2, 1, 1], hiddenWB: 0, hiddenLB: 0 },
  };

  const sum = (ns: number[]) => ns.reduce((total, x) => total + x, 0);

  /** Raw winners-round sizes: the draw is padded to a power of two and halves. */
  const rawWinnersCounts = (teamCount: number): number[] => {
    const counts: number[] = [];
    for (let size = 2 ** Math.ceil(Math.log2(teamCount)) / 2; size >= 1; size /= 2) {
      counts.push(size);
    }
    return counts;
  };

  for (const teamCount of TEAM_COUNTS) {
    const shape = SHAPES[teamCount];

    it(`renders ${shape.lb.join("/")} losers matches for ${teamCount} teams`, () => {
      const vm = buildEliminationVM(makeTournament(teamCount, "double"));

      expect(vm.winnersRounds.map((r) => r.matches.length)).toEqual(shape.wb);
      expect(vm.losersRounds.map((r) => r.matches.length)).toEqual(shape.lb);
      // A losers round with nothing contested in it is dropped, so the count is
      // 2k - 2 minus however many emptied out.
      expect(vm.losersRounds.length).toBeLessThanOrEqual(
        2 * vm.winnersRounds.length - 2,
      );
      expect(vm.losersRounds.every((r) => r.matches.length > 0)).toBe(true);
      expect(sum(rawWinnersCounts(teamCount)) - sum(shape.wb)).toBe(shape.hiddenWB);
      expect(sum(rawLosersCounts(teamCount, vm)) - sum(shape.lb)).toBe(
        shape.hiddenLB,
      );
    });

    it(`renders no bye card at all for ${teamCount} teams`, () => {
      for (const format of ["single", "double"] as const) {
        const fresh = buildEliminationVM(makeTournament(teamCount, format));
        const { vm } = playOut(teamCount, format, () => "a");

        for (const built of [fresh, vm]) {
          for (const m of renderedMatches(built)) {
            expect(["playable", "pending"], `${format} ${m.key}`).toContain(m.status);
            expect(m.a?.isBye, `${format} ${m.key}`).toBeUndefined();
            expect(m.b?.isBye, `${format} ${m.key}`).toBeUndefined();
          }
        }
      }
    });

    it(`drops each winners-round loser into the round below it (${teamCount} teams)`, () => {
      const vm = playOutWinnersOnly(teamCount);
      // Keyed by the *raw* round index the key carries, because a losers round
      // that is nothing but byes is never rendered and leaves a hole in the
      // sequence.
      const lbNames = new Map<number, Set<string>>();
      const namesInRound = (rawIndex: number) =>
        lbNames.get(rawIndex) ?? new Set<string>();
      for (const round of vm.losersRounds) {
        for (const m of round.matches) {
          const rawIndex = Number(m.key.split("-")[1]);
          const names = namesInRound(rawIndex);
          names.add(m.aName);
          names.add(m.bName);
          lbNames.set(rawIndex, names);
        }
      }
      const renderedLosers = new Map(
        vm.losersRounds.flatMap((r) => r.matches).map((m) => [m.key, m]),
      );

      vm.winnersRounds.forEach((round, i) => {
        for (const m of round.matches) {
          if (m.winner === null || m.a === null || m.b === null) continue;
          const loser = m.winner === "a" ? m.b : m.a;
          const j = Number(m.key.split("-")[2]);
          // Round 0 pairs its losers up two at a time; every later round drops
          // them straight down the zip.
          const dropRound = i === 0 ? 0 : 2 * i - 1;
          const dropKey = i === 0 ? `l-0-${Math.floor(j / 2)}` : `l-${dropRound}-${j}`;
          const target = renderedLosers.get(dropKey);
          const where = `${loser.name} lost ${m.key}`;

          if (target) {
            expect([target.aName, target.bName], where).toContain(loser.name);
          } else {
            // The drop target is a bye, so the loser walks through it and shows
            // up in a later round — never in an earlier one.
            const firstSeen = [...lbNames.keys()]
              .sort((x, y) => x - y)
              .find((rawIndex) => namesInRound(rawIndex).has(loser.name));
            expect(firstSeen, where).toBeGreaterThan(dropRound);
          }
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

describe("buildEliminationVM — match numbering", () => {
  it("numbers 8 teams (double) the way the printed sheet does", () => {
    const matches = byKey(buildEliminationVM(makeTournament(8, "double")));
    const numberOf = (key: string) => matches.get(key)?.playNumber;

    expect(["w-0-0", "w-0-1", "w-0-2", "w-0-3"].map(numberOf)).toEqual([1, 2, 3, 4]);
    expect(["l-0-0", "l-0-1"].map(numberOf)).toEqual([5, 6]);
    expect(["w-1-0", "w-1-1"].map(numberOf)).toEqual([7, 8]);
    expect(["l-1-0", "l-1-1"].map(numberOf)).toEqual([9, 10]);
    expect(numberOf("w-2-0")).toBe(11);
    expect(numberOf("l-2-0")).toBe(12);
    expect(numberOf("l-3-0")).toBe(13);
    expect(numberOf("gf")).toBe(14);
  });

  it("numbers 8 teams (single) 1..7 in round order", () => {
    const vm = buildEliminationVM(makeTournament(8, "single"));
    expect(vm.winnersRounds.map((r) => r.matches.map((m) => m.playNumber))).toEqual([
      [1, 2, 3, 4],
      [5, 6],
      [7],
    ]);
  });

  it("numbers 9 teams (double) 1..16 the way the printed sheet does", () => {
    const vm = buildEliminationVM(makeTournament(9, "double"));

    expect(vm.winnersRounds.map((r) => r.matches.map((m) => m.playNumber))).toEqual([
      [1],
      [2, 3, 4, 5],
      [7, 8],
      [11],
    ]);
    expect(vm.losersRounds.map((r) => r.matches.map((m) => m.playNumber))).toEqual([
      [6],
      [9, 10],
      [12, 13],
      [14],
      [15],
    ]);
    expect(vm.grandFinal?.playNumber).toBe(16);
  });

  it("numbers 7 teams (double) 1..12 with no bracket-reset card", () => {
    const vm = buildEliminationVM(makeTournament(7, "double"));

    expect(vm.winnersRounds.map((r) => r.matches.map((m) => m.playNumber))).toEqual([
      [1, 2, 3],
      [5, 6],
      [9],
    ]);
    expect(vm.losersRounds.map((r) => r.matches.map((m) => m.playNumber))).toEqual([
      [4],
      [7, 8],
      [10],
      [11],
    ]);
    expect(vm.grandFinal?.playNumber).toBe(12);
  });

  for (const teamCount of TEAM_COUNTS) {
    for (const format of ["single", "double"] as const) {
      const expectedCards = format === "double" ? 2 * teamCount - 2 : teamCount - 1;

      it(`renders exactly ${expectedCards} cards numbered 1..N (${teamCount} teams, ${format})`, () => {
        const rendered = renderedMatches(
          buildEliminationVM(makeTournament(teamCount, format)),
        );
        const numbers = rendered.map((m) => m.playNumber).sort((a, b) => a - b);

        expect(rendered).toHaveLength(expectedCards);
        expect(numbers).toEqual(
          Array.from({ length: rendered.length }, (_, i) => i + 1),
        );
      });

      it(`keeps the sheet identical as results come in (${teamCount} teams, ${format})`, () => {
        /** Everything a card shows that must not move: which cards exist, their
         *  numbers, and every source label on them. */
        const sheetOf = (vm: EliminationVM) =>
          renderedMatches(vm).map((m) => [
            m.key,
            m.playNumber,
            m.aSource?.label ?? null,
            m.bSource?.label ?? null,
          ]);
        const fresh = buildEliminationVM(makeTournament(teamCount, format));
        const { vm: played } = playOut(teamCount, format, () => "a");

        expect(sheetOf(played)).toEqual(sheetOf(fresh));
      });
    }
  }
});

describe("buildEliminationVM — slot sources", () => {
  const labelsOf = (matches: Map<string, MatchVM>, key: string) => {
    const match = matches.get(key);
    return [match?.aSource?.label ?? null, match?.bSource?.label ?? null];
  };

  it("points every fed slot of an 8-team double elimination at its feeder", () => {
    const matches = byKey(buildEliminationVM(makeTournament(8, "double")));
    const labels = (key: string) => labelsOf(matches, key);

    expect(labels("w-1-0")).toEqual(["W1", "W2"]);
    expect(labels("w-1-1")).toEqual(["W3", "W4"]);
    expect(labels("w-2-0")).toEqual(["W7", "W8"]);
    expect(labels("l-0-0")).toEqual(["L1", "L2"]);
    expect(labels("l-0-1")).toEqual(["L3", "L4"]);
    expect(labels("l-1-0")).toEqual(["W5", "L7"]);
    expect(labels("l-1-1")).toEqual(["W6", "L8"]);
    expect(labels("l-2-0")).toEqual(["W9", "W10"]);
    expect(labels("l-3-0")).toEqual(["W12", "L11"]);
    expect(labels("gf")).toEqual(["W11", "W13"]);
    expect(matches.get("l-3-0")?.bSource?.description).toBe("Loser of match 11");
  });

  it("chases a source through a hidden bye to the nearest rendered match (6 teams)", () => {
    const matches = byKey(buildEliminationVM(makeTournament(6, "double")));
    const numberOf = (key: string) => matches.get(key)?.playNumber;

    expect(labelsOf(matches, "l-0-0")).toEqual(["L1", "L2"]);
    expect(labelsOf(matches, "l-1-0")[0]).toBe(`W${numberOf("l-0-0")}`);
    // `l-1-1` is a bye: its only live slot holds the loser of `w-1-1`, so the
    // slot it feeds names that match rather than showing nothing at all.
    expect(matches.get("l-1-1")).toBeUndefined();
    expect(labelsOf(matches, "l-2-0")[1]).toBe(`L${numberOf("w-1-1")}`);
  });

  it("chases through a bye in the losers bracket too (9 teams)", () => {
    const matches = byKey(buildEliminationVM(makeTournament(9, "double")));
    const numberOf = (key: string) => matches.get(key)?.playNumber;

    // `l-0-0` pairs the loser of `w-0-0` against a bye and is never rendered;
    // `l-1-0`'s first slot therefore points straight at `w-0-0`.
    expect(matches.get("l-0-0")).toBeUndefined();
    expect(labelsOf(matches, "l-1-0")).toEqual([
      `L${numberOf("w-0-0")}`,
      `L${numberOf("w-1-0")}`,
    ]);
    expect(labelsOf(matches, "l-2-1")).toEqual([
      `L${numberOf("w-1-2")}`,
      `L${numberOf("w-1-3")}`,
    ]);
  });

  for (const teamCount of TEAM_COUNTS) {
    for (const format of ["single", "double"] as const) {
      it(`only ever points at rendered matches (${teamCount} teams, ${format})`, () => {
        const vm = buildEliminationVM(makeTournament(teamCount, format));
        const matches = byKey(vm);

        for (const match of renderedMatches(vm)) {
          for (const source of [match.aSource, match.bSource]) {
            if (!source) continue;
            const feeder = matches.get(source.key);
            expect(feeder, `${match.key} <- ${source.key}`).toBeDefined();
            expect(source.number, `${match.key} <- ${source.key}`).toBe(
              feeder?.playNumber,
            );
          }
        }

        expect(
          vm.winnersRounds[0].matches.every(
            (m) => m.aSource === null && m.bSource === null,
          ),
        ).toBe(true);
      });

      it(`never drops the label off an undecided losers slot (${teamCount} teams, ${format})`, () => {
        const vm = buildEliminationVM(makeTournament(teamCount, format));

        // A losers slot is only ever filled from upstream, so hiding a bye must
        // never leave one blank: every empty slot still names where its team
        // comes from.
        for (const round of vm.losersRounds) {
          for (const m of round.matches) {
            if (m.a === null) expect(m.aSource, `${m.key}.a`).not.toBeNull();
            if (m.b === null) expect(m.bSource, `${m.key}.b`).not.toBeNull();
          }
        }
        if (vm.grandFinal) {
          if (vm.grandFinal.a === null) expect(vm.grandFinal.aSource).not.toBeNull();
          if (vm.grandFinal.b === null) expect(vm.grandFinal.bSource).not.toBeNull();
        }
      });
    }
  }
});
