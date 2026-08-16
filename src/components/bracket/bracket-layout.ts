import type { RoundVM } from "@/lib/tournament/types";

/** Where one match sits in its section's grid, plus the geometry of the
 *  connector drawn into it. Percentages are of the match's own grid cell, which
 *  is exact because every leaf row is the same height. */
export type MatchPlacement = {
  key: string;
  /** 1-based grid column. */
  column: number;
  /** 1-based leaf row, before the header row's offset. */
  rowStart: number;
  rowSpan: number;
  /** Vertical position of the card inside the cell. */
  cardCentrePct: number;
  /** Null when the feeders line up, i.e. a straight line and no riser. */
  riserTopPct: number | null;
  riserHeightPct: number | null;
  hasIncoming: boolean;
  hasOutgoing: boolean;
};

export type SectionLayout = {
  columns: number;
  rows: number;
  placements: Map<string, MatchPlacement>;
};

/** Lays a bracket section out as a binary-ish tree: rounds become columns, the
 *  matches with no in-section feeder become leaf rows, and everything else is
 *  centred on the matches that feed it.
 *
 *  Only *in-section* edges count. A losers match fed by a winners-bracket
 *  drop-in, or the grand final's losers-side slot, has a source but no feeder
 *  here — those relationships are shown by the `L7` / `W13` labels instead, the
 *  way a printed sheet does it.
 *
 *  Byes never reach this function: the VM resolves a hidden bye away before
 *  layout sees it, so every source names a match that is genuinely rendered. A
 *  match whose only feeder was a bye therefore either keeps its one remaining
 *  feeder (a straight line) or becomes a fresh leaf row. */
export function layoutSection(rounds: RoundVM[]): SectionLayout {
  const rendered = new Set<string>();
  for (const round of rounds) {
    for (const match of round.matches) rendered.add(match.key);
  }

  const outgoing = new Set<string>();
  for (const round of rounds) {
    for (const match of round.matches) {
      for (const source of [match.aSource, match.bSource]) {
        if (source && rendered.has(source.key)) outgoing.add(source.key);
      }
    }
  }

  const placements = new Map<string, MatchPlacement>();
  let nextRow = 1;

  rounds.forEach((round, columnIdx) => {
    for (const match of round.matches) {
      const feeders: MatchPlacement[] = [];
      for (const source of [match.aSource, match.bSource]) {
        // Rounds are walked left to right, so an in-section feeder is always
        // already placed; anything missing here is a cross-section drop-in.
        const feeder = source ? placements.get(source.key) : undefined;
        if (feeder) feeders.push(feeder);
      }

      let rowStart: number;
      let rowSpan: number;
      if (feeders.length === 0) {
        // A leaf always takes a fresh row. Every span above is a union of rows
        // that were already handed out, so `nextRow` stays strictly greater
        // than any row in use and a late leaf can never collide with one.
        rowStart = nextRow++;
        rowSpan = 1;
      } else {
        rowStart = Math.min(...feeders.map((f) => f.rowStart));
        rowSpan = Math.max(...feeders.map((f) => f.rowStart + f.rowSpan)) - rowStart;
      }

      // Feeder centres, in row units relative to this cell's top edge.
      const centres = feeders.map((f) => f.rowStart + f.rowSpan / 2 - rowStart);
      const first = centres.length > 0 ? Math.min(...centres) : 0;
      const last = centres.length > 0 ? Math.max(...centres) : 0;
      const straight = centres.length === 0 || first === last;

      placements.set(match.key, {
        key: match.key,
        column: columnIdx + 1,
        rowStart,
        rowSpan,
        cardCentrePct: straight ? 50 : (100 * ((first + last) / 2)) / rowSpan,
        riserTopPct: straight ? null : (100 * first) / rowSpan,
        riserHeightPct: straight ? null : (100 * (last - first)) / rowSpan,
        hasIncoming: feeders.length > 0,
        hasOutgoing: outgoing.has(match.key),
      });
    }
  });

  return { columns: rounds.length, rows: nextRow - 1, placements };
}
