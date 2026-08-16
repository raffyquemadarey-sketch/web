import { describe, expect, it } from "vitest";

import {
  MAX_IMPORTED_NAMES,
  MAX_SCANNED_ROWS,
  cellToText,
  collectNames,
  describeImport,
  firstNonEmptyColumnIndex,
  looksLikeHeader,
} from "./names";
import type { ImportOutcome, ImportSkips } from "./names";

function skips(overrides: Partial<ImportSkips> = {}): ImportSkips {
  return { blank: 0, tooShort: 0, tooLong: 0, duplicate: 0, overLimit: 0, ...overrides };
}

function outcome(names: string[], overrides: Partial<ImportSkips> = {}): ImportOutcome {
  return { names, skipped: skips(overrides) };
}

describe("cellToText", () => {
  it("trims and collapses whitespace in a string", () => {
    expect(cellToText("  Jordan   Lee ")).toBe("Jordan Lee");
  });

  it("stringifies a finite number", () => {
    expect(cellToText(7)).toBe("7");
    expect(cellToText(-3.5)).toBe("-3.5");
    expect(cellToText(0)).toBe("0");
  });

  it("treats everything else as blank", () => {
    expect(cellToText("")).toBe("");
    expect(cellToText("   ")).toBe("");
    expect(cellToText(null)).toBe("");
    expect(cellToText(undefined)).toBe("");
    expect(cellToText(true)).toBe("");
    expect(cellToText(false)).toBe("");
    expect(cellToText(new Date())).toBe("");
    expect(cellToText(Number.NaN)).toBe("");
    expect(cellToText(Number.POSITIVE_INFINITY)).toBe("");
  });
});

describe("looksLikeHeader", () => {
  it("matches the closed list, whatever the case", () => {
    for (const word of [
      "name",
      "names",
      "player",
      "players",
      "player name",
      "player names",
      "full name",
      "full names",
    ]) {
      expect(looksLikeHeader(word)).toBe(true);
      expect(looksLikeHeader(word.toUpperCase())).toBe(true);
    }
  });

  it("leaves a real name that merely starts with a heading word alone", () => {
    expect(looksLikeHeader("Nameer Khan")).toBe(false);
    expect(looksLikeHeader("Playersmith")).toBe(false);
    expect(looksLikeHeader("Participant")).toBe(false);
  });
});

describe("firstNonEmptyColumnIndex", () => {
  it("picks the leftmost column with anything in it", () => {
    expect(
      firstNonEmptyColumnIndex([
        [null, null, "Ana"],
        [null, "Ben", null],
      ]),
    ).toBe(1);
  });

  it("returns -1 for a grid with nothing usable", () => {
    expect(firstNonEmptyColumnIndex([])).toBe(-1);
    expect(firstNonEmptyColumnIndex([[null, "", "  "], [true, new Date()]])).toBe(-1);
  });
});

describe("collectNames", () => {
  it("imports from the first non-empty column when column A is blank", () => {
    const result = collectNames(
      [
        [null, "Name"],
        [null, "Ana"],
        [null, "Ben"],
      ],
      [],
    );
    expect(result.names).toEqual(["Ana", "Ben"]);
  });

  it("skips a heading in each of its spellings", () => {
    for (const word of [
      "Name",
      "Names",
      "Player",
      "Players",
      "Player Name",
      "Player Names",
      "Full Name",
      "Full Names",
    ]) {
      expect(collectNames([[word], ["Ana"]], []).names).toEqual(["Ana"]);
    }
  });

  it("keeps a first cell that only looks a bit like a heading", () => {
    expect(collectNames([["Nameer Khan"], ["Ana"]], []).names).toEqual([
      "Nameer Khan",
      "Ana",
    ]);
  });

  it("only tests the first non-blank cell for a heading", () => {
    expect(collectNames([["Ana"], ["Player"]], []).names).toEqual(["Ana", "Player"]);
  });

  it("normalises the names it keeps", () => {
    expect(collectNames([["  Jordan   Lee "]], []).names).toEqual(["Jordan Lee"]);
  });

  it("imports a finite number as a name", () => {
    expect(collectNames([[42]], []).names).toEqual(["42"]);
  });

  it("counts unusable cell types as blank", () => {
    const result = collectNames([["Ana"], [true], [new Date()], [null], [""], [Number.NaN]], []);
    expect(result.names).toEqual(["Ana"]);
    expect(result.skipped).toEqual(skips({ blank: 5 }));
  });

  it("rejects a name under two characters", () => {
    const result = collectNames([["Ana"], ["A"]], []);
    expect(result.names).toEqual(["Ana"]);
    expect(result.skipped).toEqual(skips({ tooShort: 1 }));
  });

  it("rejects a name over forty characters but keeps one of exactly forty", () => {
    const forty = "A".repeat(40);
    const fortyOne = "B".repeat(41);
    const result = collectNames([[forty], [fortyOne]], []);
    expect(result.names).toEqual([forty]);
    expect(result.skipped).toEqual(skips({ tooLong: 1 }));
  });

  it("skips names already on the roster, ignoring case and spacing", () => {
    const result = collectNames([["jordan  lee"], ["Ana"]], ["Jordan Lee"]);
    expect(result.names).toEqual(["Ana"]);
    expect(result.skipped).toEqual(skips({ duplicate: 1 }));
  });

  it("adds a name repeated within the file once", () => {
    const result = collectNames([["Ana"], ["ana"], ["  ANA "]], []);
    expect(result.names).toEqual(["Ana"]);
    expect(result.skipped).toEqual(skips({ duplicate: 2 }));
  });

  it("stops at the import limit and counts the rest", () => {
    const rows = Array.from({ length: MAX_IMPORTED_NAMES + 3 }, (_, i) => [`Player ${i}`]);
    const result = collectNames(rows, []);
    expect(result.names).toHaveLength(MAX_IMPORTED_NAMES);
    expect(result.skipped).toEqual(skips({ overLimit: 3 }));
  });

  it("counts a duplicate past the limit as a duplicate, not as overflow", () => {
    const rows = [
      ...Array.from({ length: MAX_IMPORTED_NAMES }, (_, i) => [`Player ${i}`]),
      ["Player 0"],
    ];
    expect(collectNames(rows, []).skipped).toEqual(skips({ duplicate: 1 }));
  });

  it("ignores rows past the scan limit", () => {
    const rows = Array.from({ length: MAX_SCANNED_ROWS + 5 }, (_, i) => [`Player ${i}`]);
    const result = collectNames(rows, []);
    expect(result.names).toHaveLength(MAX_IMPORTED_NAMES);
    // 5000 scanned, the first 500 kept — the 5 rows past the limit never counted.
    expect(result.skipped).toEqual(
      skips({ overLimit: MAX_SCANNED_ROWS - MAX_IMPORTED_NAMES }),
    );
  });

  it("finds nothing in an empty sheet", () => {
    expect(collectNames([], [])).toEqual(outcome([]));
    expect(collectNames([[], [null, null]], [])).toEqual(outcome([]));
  });

  it("finds nothing in a sheet holding only a heading", () => {
    expect(collectNames([["Name"]], [])).toEqual(outcome([]));
  });
});

describe("describeImport", () => {
  it("reports an empty sheet", () => {
    expect(describeImport(outcome([]), "roster.xlsx")).toBe(
      "No names found in roster.xlsx.",
    );
  });

  it("reports a clean import, singular and plural", () => {
    expect(describeImport(outcome(["Ana"]), "roster.xlsx")).toBe(
      "Added 1 player from roster.xlsx.",
    );
    expect(describeImport(outcome(["Ana", "Ben"]), "roster.xlsx")).toBe(
      "Added 2 players from roster.xlsx.",
    );
  });

  it("lists every non-zero skip reason after the count", () => {
    const twelve = Array.from({ length: 12 }, (_, i) => `Player ${i}`);
    expect(
      describeImport(outcome(twelve, { duplicate: 2, blank: 1, tooLong: 1 }), "roster.xlsx"),
    ).toBe(
      "Added 12 players from roster.xlsx. Skipped 4 — 2 already on the list, 1 blank, 1 too long.",
    );
  });

  it("reports skips when nothing new was added", () => {
    expect(describeImport(outcome([], { duplicate: 3 }), "roster.csv")).toBe(
      "No new names in roster.csv. Skipped 3 — 3 already on the list.",
    );
  });

  it("names the short, long and over-limit reasons", () => {
    expect(
      describeImport(outcome(["Ana"], { tooShort: 2, tooLong: 1, overLimit: 4 }), "r.csv"),
    ).toBe(
      `Added 1 player from r.csv. Skipped 7 — 2 too short, 1 too long, 4 over the ${MAX_IMPORTED_NAMES}-name limit.`,
    );
  });
});
