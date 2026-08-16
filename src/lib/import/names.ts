import { isDuplicatePlayerName, normalisePlayerName } from "@/lib/tournament/roster";
import { addPlayerSchema } from "@/lib/validation/schemas";

/* Turning a grid of spreadsheet cells into roster names. Pure and DOM-free so it
   can be unit tested with plain arrays — the file reading lives next door in
   `read-spreadsheet.ts`.

   The rule, in one sentence: first worksheet, first column that contains any
   non-blank cell, one name per row, skipping a first cell that reads like a
   heading. */

/** How many names a single file may contribute. Past this, the rest are skipped. */
export const MAX_IMPORTED_NAMES = 500;

/** Rows past this are ignored, so a sheet with a million empty rows can't stall. */
export const MAX_SCANNED_ROWS = 5000;

/** Column headings we drop rather than import. Closed list, matched exactly. */
const HEADER_WORDS = [
  "name",
  "names",
  "player",
  "players",
  "player name",
  "player names",
  "full name",
  "full names",
];

export type ImportSkips = {
  blank: number;
  tooShort: number;
  tooLong: number;
  duplicate: number;
  overLimit: number;
};

export type ImportOutcome = { names: string[]; skipped: ImportSkips };

/**
 * A cell as a candidate name, or `""` when there is nothing usable in it.
 *
 * `unknown` rather than the library's `CellValue` on purpose: the input is
 * untrusted, and the published `CellValue` declares `typeof Date` (the
 * constructor) where it means `Date`, which fights the type checker.
 */
export function cellToText(cell: unknown): string {
  if (typeof cell === "string") return normalisePlayerName(cell);
  // A team number or a shirt number is a legitimate, if unusual, name.
  if (typeof cell === "number" && Number.isFinite(cell)) return String(cell);
  // Booleans, dates, formula errors and formulas with no cached result all land
  // here and count as blank.
  return "";
}

export function looksLikeHeader(name: string): boolean {
  return HEADER_WORDS.includes(name.toLowerCase());
}

/** Smallest column index holding any non-blank cell, or `-1` for an empty grid. */
export function firstNonEmptyColumnIndex(
  rows: readonly (readonly unknown[])[],
): number {
  let best = -1;
  for (const row of rows) {
    // Nothing past the best column so far can improve on it.
    const limit = best === -1 ? row.length : Math.min(row.length, best);
    for (let column = 0; column < limit; column += 1) {
      if (cellToText(row[column]) !== "") {
        best = column;
        break;
      }
    }
  }
  return best;
}

function emptySkips(): ImportSkips {
  return { blank: 0, tooShort: 0, tooLong: 0, duplicate: 0, overLimit: 0 };
}

/**
 * Names to add, plus a tally of why the other cells were left out. Additive: the
 * caller appends these to the roster, it never replaces it.
 */
export function collectNames(
  rows: readonly (readonly unknown[])[],
  existingNames: readonly string[],
): ImportOutcome {
  const skipped = emptySkips();
  const names: string[] = [];

  const column = firstNonEmptyColumnIndex(rows);
  if (column === -1) return { names, skipped };

  let headerChecked = false;

  for (const row of rows.slice(0, MAX_SCANNED_ROWS)) {
    const name = cellToText(row[column]);

    if (name === "") {
      skipped.blank += 1;
      continue;
    }

    // Only the first non-blank cell of the column can be a heading — a player
    // genuinely called "Names" further down is still a player.
    if (!headerChecked) {
      headerChecked = true;
      if (looksLikeHeader(name)) continue;
    }

    // The same 2/40 bounds the single-add form uses, from the same schema.
    if (!addPlayerSchema.safeParse({ name }).success) {
      if (name.length > 40) skipped.tooLong += 1;
      else skipped.tooShort += 1;
      continue;
    }

    // Against the roster and against the names accepted earlier in this file, so
    // a sheet listing someone twice adds them once.
    if (isDuplicatePlayerName([...existingNames, ...names], name)) {
      skipped.duplicate += 1;
      continue;
    }

    if (names.length >= MAX_IMPORTED_NAMES) {
      skipped.overLimit += 1;
      continue;
    }

    names.push(name);
  }

  return { names, skipped };
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function skipPhrases(skipped: ImportSkips): string[] {
  return [
    skipped.duplicate > 0 ? `${skipped.duplicate} already on the list` : "",
    skipped.blank > 0 ? `${skipped.blank} blank` : "",
    skipped.tooShort > 0 ? `${skipped.tooShort} too short` : "",
    skipped.tooLong > 0 ? `${skipped.tooLong} too long` : "",
    skipped.overLimit > 0
      ? `${skipped.overLimit} over the ${MAX_IMPORTED_NAMES}-name limit`
      : "",
  ].filter((phrase) => phrase !== "");
}

/** One plain-English sentence — or two — for the `role="status"` line. */
export function describeImport(outcome: ImportOutcome, fileName: string): string {
  const phrases = skipPhrases(outcome.skipped);
  const total = Object.values(outcome.skipped).reduce((sum, count) => sum + count, 0);
  const tail = total === 0 ? "" : ` Skipped ${total} — ${phrases.join(", ")}.`;

  if (outcome.names.length === 0) {
    if (total === 0) return `No names found in ${fileName}.`;
    return `No new names in ${fileName}.${tail}`;
  }

  return `Added ${plural(outcome.names.length, "player")} from ${fileName}.${tail}`;
}
