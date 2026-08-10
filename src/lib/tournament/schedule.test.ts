import { describe, expect, it } from "vitest";

import {
  describeSchedule,
  estimateSchedule,
  formatDuration,
  getRoundSizes,
} from "./schedule";
import type { ScheduleInput } from "./schedule";

const TEAM_COUNTS = [4, 5, 6, 7, 8, 9, 10, 16] as const;

const sum = (ns: number[]) => ns.reduce((total, n) => total + n, 0);

function input(overrides: Partial<ScheduleInput> = {}): ScheduleInput {
  return {
    format: "single",
    teamCount: 8,
    courtCount: 4,
    matchMinutes: 30,
    sessionMinutes: 240,
    ...overrides,
  };
}

describe("getRoundSizes", () => {
  it("counts single-elimination rounds with byes already excluded", () => {
    expect(getRoundSizes("single", 4)).toEqual([2, 1]);
    expect(getRoundSizes("single", 5)).toEqual([1, 2, 1]);
    expect(getRoundSizes("single", 8)).toEqual([4, 2, 1]);
    expect(getRoundSizes("single", 10)).toEqual([2, 4, 2, 1]);
    expect(getRoundSizes("single", 16)).toEqual([8, 4, 2, 1]);
  });

  it("counts round-robin rounds, skipping the odd-field bye", () => {
    expect(getRoundSizes("roundrobin", 4)).toEqual([2, 2, 2]);
    expect(getRoundSizes("roundrobin", 5)).toEqual([2, 2, 2, 2, 2]);
    expect(getRoundSizes("roundrobin", 16)).toEqual(Array(15).fill(8));
  });

  it("concatenates winners, losers and grand-final rounds for double elimination", () => {
    expect(getRoundSizes("double", 8)).toEqual([4, 2, 1, 2, 2, 1, 1, 1]);
    expect(getRoundSizes("double", 16)).toEqual([8, 4, 2, 1, 4, 4, 2, 2, 1, 1, 1]);
  });

  it("has no draw to schedule below 2 teams", () => {
    for (const format of ["single", "double", "roundrobin"] as const) {
      expect(getRoundSizes(format, 0)).toEqual([]);
      expect(getRoundSizes(format, 1)).toEqual([]);
    }
  });

  it("totals n-1 matches for every single-elimination draw", () => {
    for (const n of TEAM_COUNTS) {
      expect(sum(getRoundSizes("single", n)), `${n} teams`).toBe(n - 1);
    }
  });

  it("totals every pairing once for every round-robin draw", () => {
    for (const n of TEAM_COUNTS) {
      expect(sum(getRoundSizes("roundrobin", n)), `${n} teams`).toBe(
        (n * (n - 1)) / 2,
      );
    }
  });

  it("totals 2n-2 for a power-of-two double draw and bounds the rest above it", () => {
    for (const n of TEAM_COUNTS) {
      const total = sum(getRoundSizes("double", n));
      const { isUpperBound } = estimateSchedule(input({ format: "double", teamCount: n }));

      if (n === 4 || n === 8 || n === 16) {
        expect(total, `${n} teams`).toBe(2 * n - 2);
        expect(isUpperBound, `${n} teams`).toBe(false);
      } else {
        expect(total, `${n} teams`).toBeGreaterThanOrEqual(2 * n - 2);
        expect(isUpperBound, `${n} teams`).toBe(true);
      }
    }
  });
});

describe("estimateSchedule", () => {
  it("charges one court slot per round, however many courts are free", () => {
    const e = estimateSchedule(input({ format: "single", teamCount: 8, courtCount: 4 }));
    expect(e.roundSizes).toEqual([4, 2, 1]);
    expect(e.totalMatches).toBe(7);
    expect(e.courtSlots).toBe(3);
    expect(e.estimatedMinutes).toBe(90);
    expect(e.fitsInSession).toBe(true);
    expect(e.spareMinutes).toBe(150);
  });

  it("adds up the losers bracket and grand final too", () => {
    const e = estimateSchedule(input({ format: "double", teamCount: 8, courtCount: 6 }));
    expect(e.courtSlots).toBe(8);
    expect(e.estimatedMinutes).toBe(240);
  });

  it("stacks matches into several slots when courts are scarce", () => {
    const e = estimateSchedule(input({ format: "double", teamCount: 16, courtCount: 2 }));
    expect(e.courtSlots).toBe(17);
    expect(e.estimatedMinutes).toBe(510);
    expect(e.fitsInSession).toBe(false);
    expect(e.overrunMinutes).toBe(270);
    expect(e.spareMinutes).toBe(0);
  });

  it("scales with match length", () => {
    const e = estimateSchedule(
      input({ format: "single", teamCount: 16, courtCount: 8, matchMinutes: 45 }),
    );
    expect(e.estimatedMinutes).toBe(180);
  });

  it("treats a session that exactly matches the estimate as a fit", () => {
    const e = estimateSchedule(
      input({ format: "double", teamCount: 8, courtCount: 6, sessionMinutes: 240 }),
    );
    expect(e.estimatedMinutes).toBe(240);
    expect(e.fitsInSession).toBe(true);
    expect(e.overrunMinutes).toBe(0);
    expect(e.spareMinutes).toBe(0);
    expect(describeSchedule(e).verdict).toBe("That exactly fills your 4h session.");
  });

  it("estimates nothing for a draw below 2 teams", () => {
    for (const teamCount of [0, 1]) {
      const e = estimateSchedule(input({ teamCount }));
      expect(e.roundSizes, `${teamCount} teams`).toEqual([]);
      expect(e.totalMatches, `${teamCount} teams`).toBe(0);
      expect(e.estimatedMinutes, `${teamCount} teams`).toBe(0);
      expect(e.fitsInSession, `${teamCount} teams`).toBe(true);
    }
  });
});

describe("formatDuration", () => {
  it("reads as a person would say it", () => {
    expect(formatDuration(0)).toBe("0m");
    expect(formatDuration(45)).toBe("45m");
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(90)).toBe("1h 30m");
    expect(formatDuration(240)).toBe("4h");
    expect(formatDuration(510)).toBe("8h 30m");
  });
});

describe("describeSchedule", () => {
  it("summarises the settings, the duration and the shape of the draw", () => {
    const e = estimateSchedule(input({ format: "single", teamCount: 8, courtCount: 4 }));
    expect(describeSchedule(e).summary).toBe(
      "8 teams, single elimination on 4 courts at 30 min ≈ 1h 30m — 7 matches over 3 rounds.",
    );
    expect(describeSchedule(e).verdict).toBe("Your 4h session leaves 2h 30m spare.");
  });

  it("says how to claw back an overrun", () => {
    const e = estimateSchedule(input({ format: "double", teamCount: 16, courtCount: 2 }));
    expect(describeSchedule(e).summary).toBe(
      "16 teams, double elimination on 2 courts at 30 min ≈ 8h 30m — 30 matches over 11 rounds.",
    );
    expect(describeSchedule(e).verdict).toBe(
      "That's 4h 30m longer than your 4h session — add courts, shorten matches, or cut the team count.",
    );
  });

  it("labels a non-power-of-two double draw as a ceiling", () => {
    const bounded = estimateSchedule(input({ format: "double", teamCount: 9 }));
    expect(describeSchedule(bounded).summary).toContain(" Byes may make it shorter.");

    for (const teamCount of [8, 16]) {
      const exact = estimateSchedule(input({ format: "double", teamCount }));
      expect(describeSchedule(exact).summary, `${teamCount} teams`).not.toContain(
        "Byes may make it shorter.",
      );
    }
  });

  it("asks for a real draw before estimating anything", () => {
    expect(describeSchedule(estimateSchedule(input({ teamCount: 1 })))).toEqual({
      summary: "Add at least 2 teams to estimate a schedule.",
      verdict: "",
    });
  });
});
