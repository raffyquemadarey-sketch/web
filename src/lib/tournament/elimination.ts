import type { Tournament } from "@/lib/data/types";
import type { MatchSide } from "@/lib/validation/enums";

import { roundLabel } from "./labels";
import type {
  BracketTeam,
  EliminationVM,
  MatchStatus,
  MatchVM,
  RoundVM,
  SlotSource,
} from "./types";

/* Deliberate deviation from the original prototype (`app-logic.js`): it left
   structurally-empty losers-bracket slots as `null`, so a bye's non-existent
   loser was paired against a real team and that match could never be decided —
   every non-power-of-two draw deadlocked before crowning a champion. Here an
   empty slot is the BYE sentinel and resolves as a walkover. This is an
   intentional correctness fix, not a fidelity slip; please do not "restore" it. */

const BYE: BracketTeam = { idx: -1, name: "Bye", isBye: true };

function isBye(team: BracketTeam | null): boolean {
  return team?.isBye === true;
}

/** Whether a match is a real fixture someone could turn up for, and therefore
 *  the only thing worth putting on the sheet. Note this keys off slot BYE-ness,
 *  not `status`: a slot's BYE-ness is written when the draw is built and never
 *  changes, whereas `status` moves from `pending` to `walkover` as results land.
 *  Numbering off `status` would renumber the sheet mid-tournament. */
const isContested = (m: RawMatch): boolean => !isBye(m.a) && !isBye(m.b);

/** A bracket slot. A team, the BYE sentinel (structurally empty — nothing will
 *  ever land here), or null (an upstream match exists but is undecided). */
type Slot = BracketTeam | null;

/** A match as `mk` can know it: everything that is decided locally, minus the
 *  sequence numbers and slot sources, which only exist once the whole draw is
 *  built and every round has been put in play order. */
type RawMatch = Omit<MatchVM, "playNumber" | "aSource" | "bSource">;

/** Structural pointer from a slot back to the match that feeds it. Recorded
 *  while the bracket is built, resolved into a `SlotSource` once numbers exist. */
type SlotRef = { key: string; outcome: "winner" | "loser" };

/** Reading past the end of a feeding array means the slot does not exist at
 *  all, which is structural emptiness — not a result we are waiting for. */
const at = (arr: Slot[], i: number): Slot => (i < arr.length ? arr[i] : BYE);

const realOrNull = (slot: Slot): BracketTeam | null =>
  slot && !isBye(slot) ? slot : null;

/** Losers-first, so a winners final and the losers consolation round it runs
 *  alongside land in the order the printable sheets use. */
const SECTION_RANK: Record<"l" | "w" | "gf", number> = { l: 0, w: 1, gf: 2 };

export function buildEliminationVM(t: Tournament): EliminationVM {
  const teams: BracketTeam[] = t.teams.map((name, idx) => ({ idx, name }));
  const decisions = t.decisions;
  const courtCount = t.courtCount || 4;
  let courtSeq = 0;

  /** Slot → feeding match, keyed by the fed match. Absent entries (winners
   *  round 0) mean "nothing upstream", which is not the same as a feeder that
   *  exists but is never rendered — that one is chased through below. */
  const slotRefs: Record<string, { a: SlotRef | null; b: SlotRef | null }> = {};

  /** Every match the algorithm builds, rendered or not. Chasing a source through
   *  a hidden match means looking at that match's own slots, so they have to
   *  stay reachable after the filtering below drops them from the VM. */
  const rawByKey = new Map<string, RawMatch>();

  const mk = (
    key: string,
    a: BracketTeam | null | undefined,
    b: BracketTeam | null | undefined,
  ): RawMatch => {
    const aTeam = a ?? null;
    const bTeam = b ?? null;
    const aEmpty = isBye(aTeam);
    const bEmpty = isBye(bTeam);
    const decision = decisions[key];
    let status: MatchStatus;
    let winner: MatchSide | null = null;
    if (aEmpty && bEmpty) {
      status = "void";
    } else if (aEmpty && bTeam) {
      status = "walkover";
      winner = "b";
    } else if (bEmpty && aTeam) {
      status = "walkover";
      winner = "a";
    } else if (aTeam && bTeam) {
      status = "playable";
      winner = decision === "a" ? "a" : decision === "b" ? "b" : null;
    } else {
      status = "pending";
    }
    const canPick = status === "playable";
    const winnerTeam =
      winner === "a" ? realOrNull(aTeam) : winner === "b" ? realOrNull(bTeam) : null;
    const court = (courtSeq % courtCount) + 1;
    if (canPick) courtSeq++;
    const match: RawMatch = {
      key,
      a: aTeam,
      b: bTeam,
      aName: aTeam ? aTeam.name : "TBD",
      bName: bTeam ? bTeam.name : "TBD",
      winner,
      winnerTeam,
      canPick,
      status,
      court,
      courtLabel: `Court ${court}`,
    };
    rawByKey.set(key, match);
    return match;
  };

  /** What a match feeds into the next round: its winner, or structural emptiness
   *  when the match can never be played. Returning BYE here (rather than null) is
   *  what stops an unplayable match from stranding the round below it. */
  const nextSlot = (m: RawMatch): Slot => (m.status === "void" ? BYE : m.winnerTeam);

  /** Numbers every rendered match `1..N` in play order, then hands each match
   *  its number and its resolved slot sources. `orderedRounds` is exactly the
   *  rendered set, so anything a slot points at that is missing from `numbers`
   *  is a hidden match and gets chased through to the nearest rendered ancestor. */
  const numberAndDecorate = (orderedRounds: RawMatch[][]) => {
    const numbers = new Map<string, number>();
    let playSeq = 0;
    for (const round of orderedRounds) {
      for (const match of round) numbers.set(match.key, ++playSeq);
    }

    /** What a hidden match's winner really is. A hidden match has at most one
     *  live slot — the other is the BYE sentinel — so whatever lands in that
     *  slot is the team that walks straight through, and its source is *this*
     *  match's source. A void match has no live slot at all and ends the chain.
     *  A loser-ref ends it too: a match nobody plays produces no loser. (No
     *  rendered slot ever holds a loser-ref to a hidden match — a hidden winners
     *  match drops the BYE sentinel into the losers slot below it, which makes
     *  that losers match hidden in turn.) */
    const passThrough = (ref: SlotRef): SlotRef | null => {
      const hidden = rawByKey.get(ref.key);
      if (!hidden || ref.outcome === "loser") return null;
      const side = !isBye(hidden.a) ? "a" : !isBye(hidden.b) ? "b" : null;
      if (!side) return null;
      return slotRefs[hidden.key]?.[side] ?? null;
    };

    /** Walks upstream until the ref names a rendered match, or dies. Refs point
     *  strictly at earlier matches, so this terminates; the seen set is belt and
     *  braces. */
    const resolveRef = (ref: SlotRef | null | undefined): SlotRef | null => {
      const seen = new Set<string>();
      let current = ref ?? null;
      while (current && !numbers.has(current.key)) {
        if (seen.has(current.key)) return null;
        seen.add(current.key);
        current = passThrough(current);
      }
      return current;
    };

    const sourceOf = (ref: SlotRef | null | undefined): SlotSource | null => {
      const resolved = resolveRef(ref);
      if (!resolved) return null;
      const number = numbers.get(resolved.key);
      if (number === undefined) return null;
      const winnerSide = resolved.outcome === "winner";
      return {
        key: resolved.key,
        outcome: resolved.outcome,
        number,
        label: `${winnerSide ? "W" : "L"}${number}`,
        description: `${winnerSide ? "Winner" : "Loser"} of match ${number}`,
      };
    };

    // Every match reaching `decorate` was numbered in the walk above, so the
    // lookup always hits; the fallback only exists to satisfy the type.
    return (match: RawMatch): MatchVM => ({
      ...match,
      playNumber: numbers.get(match.key) ?? 0,
      aSource: sourceOf(slotRefs[match.key]?.a),
      bSource: sourceOf(slotRefs[match.key]?.b),
    });
  };

  const n = teams.length;
  const targetSize = Math.max(2, Math.pow(2, Math.ceil(Math.log2(Math.max(n, 1)))));
  const matchCount0 = targetSize / 2;
  const byes = targetSize - n;
  let realIdx = 0;
  const round0: RawMatch[] = [];
  for (let m = 0; m < matchCount0; m++) {
    if (m >= matchCount0 - byes) {
      round0.push(mk(`w-0-${m}`, teams[realIdx++], BYE));
    } else {
      round0.push(mk(`w-0-${m}`, teams[realIdx++], teams[realIdx++]));
    }
  }

  const winnersRoundsRaw: RawMatch[][] = [round0];
  let current: Slot[] = round0.map(nextSlot);
  let r = 1;
  while (current.length > 1) {
    const round: RawMatch[] = [];
    for (let i = 0; i < current.length; i += 2) {
      const key = `w-${r}-${i / 2}`;
      slotRefs[key] = {
        a: { key: `w-${r - 1}-${i}`, outcome: "winner" },
        b: { key: `w-${r - 1}-${i + 1}`, outcome: "winner" },
      };
      round.push(mk(key, current[i], current[i + 1]));
    }
    winnersRoundsRaw.push(round);
    current = round.map(nextSlot);
    r++;
  }
  const wbChampion = realOrNull(current[0] ?? null);

  /* Only contested matches reach the sheet. A bye is not a fixture: the team
     that draws one simply turns up in its next-round slot, exactly as a printed
     draw shows it. `winnersRoundsRaw` stays the structural truth — losers drop
     slots, depths and round labels are all derived from it. Powers of two have
     no BYE slot anywhere, so both arrays are identical there. */
  const winnersRendered = winnersRoundsRaw.map((round) => round.filter(isContested));

  if (t.format !== "double") {
    const decorate = numberAndDecorate(winnersRendered);
    const winnersRounds: RoundVM[] = winnersRoundsRaw.map((round, i) => ({
      label: `Round ${i + 1} · ${roundLabel(round.length)}`,
      matches: winnersRendered[i].map((match) => decorate(match)),
    }));
    return {
      kind: "elimination",
      winnersRounds,
      hasLosers: false,
      losersRounds: [],
      grandFinal: null,
      grandFinalLabel: null,
      championName: wbChampion ? wbChampion.name : null,
    };
  }

  // A team drops into the losers bracket in the round it lost. A bye or void
  // winners match yields no loser at all, so that losers slot is permanently
  // empty (BYE) rather than merely undecided (null).
  const wbLoserSlots: Slot[][] = winnersRoundsRaw.map((round) =>
    round.map((m) => {
      if (m.status === "walkover" || m.status === "void") return BYE;
      if (!m.winnerTeam) return null;
      return m.winner === "a" ? m.b : m.a;
    }),
  );

  const k = winnersRoundsRaw.length;
  const pairUp = (
    arr: Slot[],
    roundIdx: number,
    refOf: (slotIndex: number) => SlotRef | null,
  ): RawMatch[] => {
    const round: RawMatch[] = [];
    for (let i = 0; i < arr.length; i += 2) {
      const key = `l-${roundIdx}-${i / 2}`;
      slotRefs[key] = { a: refOf(i), b: refOf(i + 1) };
      round.push(mk(key, at(arr, i), at(arr, i + 1)));
    }
    return round;
  };
  const zipPair = (
    arrA: Slot[],
    arrB: Slot[],
    roundIdx: number,
    refA: (slotIndex: number) => SlotRef | null,
    refB: (slotIndex: number) => SlotRef | null,
  ): RawMatch[] => {
    const round: RawMatch[] = [];
    const len = Math.max(arrA.length, arrB.length);
    for (let i = 0; i < len; i++) {
      const key = `l-${roundIdx}-${i}`;
      slotRefs[key] = { a: refA(i), b: refB(i) };
      round.push(mk(key, at(arrA, i), at(arrB, i)));
    }
    return round;
  };

  const losersRoundsRaw: RawMatch[][] = [];
  const firstDrop = pairUp(wbLoserSlots[0] ?? [], 0, (i) =>
    i < round0.length ? { key: `w-0-${i}`, outcome: "loser" } : null,
  );
  losersRoundsRaw.push(firstDrop);
  let survObjs: Slot[] = firstDrop.map(nextSlot);
  let lbIdx = 1;
  for (let i = 1; i < k; i++) {
    const prevDrop = lbIdx - 1;
    const dropRound = zipPair(
      survObjs,
      wbLoserSlots[i] ?? [],
      lbIdx,
      (j) =>
        j < losersRoundsRaw[prevDrop].length
          ? { key: `l-${prevDrop}-${j}`, outcome: "winner" }
          : null,
      (j) =>
        j < winnersRoundsRaw[i].length
          ? { key: `w-${i}-${j}`, outcome: "loser" }
          : null,
    );
    losersRoundsRaw.push(dropRound);
    survObjs = dropRound.map(nextSlot);
    lbIdx++;
    if (i < k - 1) {
      const prevConsol = lbIdx - 1;
      const consolRound = pairUp(survObjs, lbIdx, (j) =>
        j < losersRoundsRaw[prevConsol].length
          ? { key: `l-${prevConsol}-${j}`, outcome: "winner" }
          : null,
      );
      losersRoundsRaw.push(consolRound);
      survObjs = consolRound.map(nextSlot);
      lbIdx++;
    }
  }
  const lbChampion = realOrNull(survObjs[0] ?? null);

  // Same filter as the winners bracket: a slot fed by a bye is filler, whether
  // it is void (both slots empty) or a walkover-to-be (one slot empty). Unlike
  // the winners bracket a whole losers round can come out empty — 5 and 9 teams
  // drop every match of losers round 0 — so the round ordering below has to skip
  // those rounds rather than assume it lines up with the raw indices.
  const losersRendered = losersRoundsRaw.map((round) => round.filter(isContested));

  const grandFinalRaw = mk("gf", wbChampion, lbChampion);
  slotRefs["gf"] = {
    a: { key: `w-${k - 1}-0`, outcome: "winner" },
    b: { key: `l-${losersRoundsRaw.length - 1}-0`, outcome: "winner" },
  };

  // Play order is dependency depth: a round happens as soon as everything
  // feeding it has been played. Winners round i only waits on winners round
  // i - 1; a losers drop round waits on both the winners round that feeds it
  // and the losers round before it; a consolation round waits on its drop round.
  const depthWB = winnersRoundsRaw.map((_, i) => i + 1);
  const depthLB: number[] = [depthWB[0] + 1];
  for (let i = 1; i < k; i++) {
    depthLB[2 * i - 1] = Math.max(depthWB[i], depthLB[2 * i - 2]) + 1;
    if (i < k - 1) depthLB[2 * i] = depthLB[2 * i - 1] + 1;
  }
  const depthGF = Math.max(depthWB[k - 1], depthLB[depthLB.length - 1]) + 1;

  // A losers round with nothing contested in it is not a round anyone turns up
  // for, so it is dropped before the "Round N" numbers are handed out and the
  // sequence stays contiguous. Only losers rounds can empty out: winners round 0
  // always keeps n - targetSize/2 >= 1 matches, later winners rounds hold no BYE
  // slot at all, and the grand final's two slots are real teams or null.
  const roundOrder: { section: "w" | "l" | "gf"; index: number; depth: number }[] = [
    ...depthWB.map((depth, index) => ({ section: "w" as const, index, depth })),
    ...depthLB.map((depth, index) => ({ section: "l" as const, index, depth })),
    { section: "gf" as const, index: 0, depth: depthGF },
  ].filter(
    (round) => round.section !== "l" || losersRendered[round.index].length > 0,
  );
  roundOrder.sort(
    (x, y) =>
      x.depth - y.depth ||
      SECTION_RANK[x.section] - SECTION_RANK[y.section] ||
      x.index - y.index,
  );

  const wbOrder: number[] = [];
  const lbOrder: number[] = [];
  let gfOrder = 0;
  roundOrder.forEach((round, i) => {
    if (round.section === "w") wbOrder[round.index] = i + 1;
    else if (round.section === "l") lbOrder[round.index] = i + 1;
    else gfOrder = i + 1;
  });

  const decorate = numberAndDecorate(
    roundOrder.map((round) =>
      round.section === "w"
        ? winnersRendered[round.index]
        : round.section === "l"
          ? losersRendered[round.index]
          : [grandFinalRaw],
    ),
  );

  // The winners label still reads off the *raw* round size, so a 9-team draw
  // calls its one-card opening column "Round of 16" rather than "Final".
  const winnersRounds: RoundVM[] = winnersRoundsRaw.map((round, i) => ({
    label: `Round ${wbOrder[i]} · ${roundLabel(round.length)}`,
    matches: winnersRendered[i].map((match) => decorate(match)),
  }));
  // "Losers N" counts the columns the sheet actually shows, so a dropped round
  // leaves no gap there either.
  const losersRounds: RoundVM[] = losersRendered
    .map((round, i) => ({ round, i }))
    .filter(({ round }) => round.length > 0)
    .map(({ round, i }, position) => ({
      label: `Round ${lbOrder[i]} · Losers ${position + 1}`,
      matches: round.map((match) => decorate(match)),
    }));
  const grandFinal = decorate(grandFinalRaw);

  return {
    kind: "elimination",
    winnersRounds,
    hasLosers: true,
    losersRounds,
    grandFinal,
    grandFinalLabel: `Round ${gfOrder} · Grand final`,
    championName: grandFinal.winnerTeam ? grandFinal.winnerTeam.name : null,
  };
}
