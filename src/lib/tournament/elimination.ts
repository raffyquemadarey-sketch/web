import type { Tournament } from "@/lib/data/types";
import type { MatchSide } from "@/lib/validation/enums";

import { roundLabel } from "./labels";
import type {
  BracketTeam,
  EliminationVM,
  MatchStatus,
  MatchVM,
  RoundVM,
} from "./types";

/* Deliberate deviation from the original prototype (`app-logic.js`): it left
   structurally-empty losers-bracket slots as `null`, so a bye's non-existent
   loser was paired against a real team and that match could never be decided —
   every non-power-of-two draw deadlocked before crowning a champion. Here an
   empty slot is the BYE sentinel and resolves as a walkover. This is an
   intentional correctness fix, not a fidelity slip; please do not "restore" it. */

/** Fixed row height a round column reserves per first-round match. */
export const BRACKET_ROW_HEIGHT = 112;

const BYE: BracketTeam = { idx: -1, name: "Bye", isBye: true };

function isBye(team: BracketTeam | null): boolean {
  return team?.isBye === true;
}

/** A bracket slot. A team, the BYE sentinel (structurally empty — nothing will
 *  ever land here), or null (an upstream match exists but is undecided). */
type Slot = BracketTeam | null;

/** Reading past the end of a feeding array means the slot does not exist at
 *  all, which is structural emptiness — not a result we are waiting for. */
const at = (arr: Slot[], i: number): Slot => (i < arr.length ? arr[i] : BYE);

const realOrNull = (slot: Slot): BracketTeam | null =>
  slot && !isBye(slot) ? slot : null;

export function buildEliminationVM(t: Tournament): EliminationVM {
  const teams: BracketTeam[] = t.teams.map((name, idx) => ({ idx, name }));
  const decisions = t.decisions;
  const courtCount = t.courtCount || 4;
  let courtSeq = 0;

  const mk = (
    key: string,
    a: BracketTeam | null | undefined,
    b: BracketTeam | null | undefined,
  ): MatchVM => {
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
    return {
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
  };

  /** What a match feeds into the next round: its winner, or structural emptiness
   *  when the match can never be played. Returning BYE here (rather than null) is
   *  what stops an unplayable match from stranding the round below it. */
  const nextSlot = (m: MatchVM): Slot => (m.status === "void" ? BYE : m.winnerTeam);

  const n = teams.length;
  const targetSize = Math.max(2, Math.pow(2, Math.ceil(Math.log2(Math.max(n, 1)))));
  const matchCount0 = targetSize / 2;
  const byes = targetSize - n;
  let realIdx = 0;
  const round0: MatchVM[] = [];
  for (let m = 0; m < matchCount0; m++) {
    if (m >= matchCount0 - byes) {
      round0.push(mk(`w-0-${m}`, teams[realIdx++], BYE));
    } else {
      round0.push(mk(`w-0-${m}`, teams[realIdx++], teams[realIdx++]));
    }
  }

  const winnersRoundsRaw: MatchVM[][] = [round0];
  let current: Slot[] = round0.map(nextSlot);
  let r = 1;
  while (current.length > 1) {
    const round: MatchVM[] = [];
    for (let i = 0; i < current.length; i += 2) {
      round.push(mk(`w-${r}-${i / 2}`, current[i], current[i + 1]));
    }
    winnersRoundsRaw.push(round);
    current = round.map(nextSlot);
    r++;
  }
  const wbChampion = realOrNull(current[0] ?? null);
  const wbHeight = (winnersRoundsRaw[0]?.length ?? 1) * BRACKET_ROW_HEIGHT;

  if (t.format !== "double") {
    const winnersRounds: RoundVM[] = winnersRoundsRaw.map((round, i) => ({
      label: `Round ${i + 1} · ${roundLabel(round.length)}`,
      matches: round,
      height: wbHeight,
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
  const pairUp = (arr: Slot[], roundIdx: number): MatchVM[] => {
    const round: MatchVM[] = [];
    for (let i = 0; i < arr.length; i += 2) {
      round.push(mk(`l-${roundIdx}-${i / 2}`, at(arr, i), at(arr, i + 1)));
    }
    return round;
  };
  const zipPair = (arrA: Slot[], arrB: Slot[], roundIdx: number): MatchVM[] => {
    const round: MatchVM[] = [];
    const len = Math.max(arrA.length, arrB.length);
    for (let i = 0; i < len; i++) {
      round.push(mk(`l-${roundIdx}-${i}`, at(arrA, i), at(arrB, i)));
    }
    return round;
  };

  const losersRoundsRaw: MatchVM[][] = [];
  const firstDrop = pairUp(wbLoserSlots[0] ?? [], 0);
  losersRoundsRaw.push(firstDrop);
  let survObjs: Slot[] = firstDrop.map(nextSlot);
  let lbIdx = 1;
  for (let i = 1; i < k; i++) {
    const dropRound = zipPair(survObjs, wbLoserSlots[i] ?? [], lbIdx);
    losersRoundsRaw.push(dropRound);
    survObjs = dropRound.map(nextSlot);
    lbIdx++;
    if (i < k - 1) {
      const consolRound = pairUp(survObjs, lbIdx);
      losersRoundsRaw.push(consolRound);
      survObjs = consolRound.map(nextSlot);
      lbIdx++;
    }
  }
  const lbChampion = realOrNull(survObjs[0] ?? null);

  // Void matches are structural filler; rendering them would put dead
  // "TBD v TBD" cards in the column. Walkovers are kept, matching how the
  // winners bracket already shows byes. No losers round is ever entirely void —
  // round 0 always receives at least one contested winners match, and rounds >= 1
  // always receive real winners-bracket losers — so no round is dropped and the
  // `lbOrder` play-order numbering below stays aligned with the raw indices.
  const losersRendered = losersRoundsRaw.map((round) =>
    round.filter((m) => m.status !== "void"),
  );
  const lbHeight =
    Math.max(1, ...losersRendered.map((r) => r.length)) * BRACKET_ROW_HEIGHT;

  // Real-world play order: WB0, LB0, then for i=1..k-1: WBi, LB(2i-1),
  // [LB(2i) if i < k-1], then the grand final.
  const playSeq: { w?: number; l?: number }[] = [{ w: 0 }, { l: 0 }];
  for (let i = 1; i < k; i++) {
    playSeq.push({ w: i });
    playSeq.push({ l: 2 * i - 1 });
    if (i < k - 1) playSeq.push({ l: 2 * i });
  }
  const wbOrder: Record<number, number> = {};
  const lbOrder: Record<number, number> = {};
  playSeq.forEach((step, i) => {
    if (step.w !== undefined) wbOrder[step.w] = i + 1;
    if (step.l !== undefined) lbOrder[step.l] = i + 1;
  });
  const gfOrder = playSeq.length + 1;

  const winnersRounds: RoundVM[] = winnersRoundsRaw.map((round, i) => ({
    label: `Round ${wbOrder[i]} · ${roundLabel(round.length)}`,
    matches: round,
    height: wbHeight,
  }));
  const losersRounds: RoundVM[] = losersRendered.map((round, i) => ({
    label: `Round ${lbOrder[i]} · Losers ${i + 1}`,
    matches: round,
    height: lbHeight,
  }));
  const grandFinal = mk("gf", wbChampion, lbChampion);

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
