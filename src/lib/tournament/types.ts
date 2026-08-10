import type { MatchSide } from "@/lib/validation/enums";

export type BracketTeam = {
  idx: number;
  name: string;
  isBye?: true;
};

/** How a bracket slot pairing resolved.
 *  playable — two real teams, the result is a user decision
 *  pending  — at least one slot waits on an undecided upstream match (renders TBD)
 *  walkover — exactly one real team, the other slot is structurally empty; the
 *             real team advances without playing (winners-bracket byes included)
 *  void     — both slots are structurally empty; the match is never played and
 *             is not rendered */
export type MatchStatus = "playable" | "pending" | "walkover" | "void";

/** Where an as-yet-undecided slot's occupant will come from. Structural:
 *  present whenever the feeding match is rendered, regardless of decisions. */
export type SlotSource = {
  /** Key of the feeding match, e.g. "w-0-2". */
  key: string;
  /** Which of that match's two teams arrives here. */
  outcome: "winner" | "loser";
  /** The feeding match's playNumber. */
  number: number;
  /** Shown in an empty slot: "L3" / "W12". */
  label: string;
  /** title / aria form: "Loser of match 3". */
  description: string;
};

export type MatchVM = {
  key: string;
  a: BracketTeam | null;
  b: BracketTeam | null;
  aName: string;
  bName: string;
  winner: MatchSide | null;
  winnerTeam: BracketTeam | null;
  canPick: boolean;
  /** Invariant: `canPick === (status === "playable")`. */
  status: MatchStatus;
  court: number;
  courtLabel: string;
  /** 1-based, sequential across the whole draw in play order. Stable for a given
   *  team count + format: it depends only on which matches are rendered, never
   *  on `decisions`, so the sheet never renumbers itself mid-tournament. */
  playNumber: number;
  /** Null when the slot has no rendered feeder (a first-round slot, a
   *  cross-bracket drop whose feeder was void, …). */
  aSource: SlotSource | null;
  bSource: SlotSource | null;
};

export type RoundVM = {
  label: string;
  matches: MatchVM[];
};

export type EliminationVM = {
  kind: "elimination";
  winnersRounds: RoundVM[];
  hasLosers: boolean;
  losersRounds: RoundVM[];
  grandFinal: MatchVM | null;
  grandFinalLabel: string | null;
  championName: string | null;
};

export type RoundRobinMatchVM = {
  key: string;
  a: BracketTeam;
  b: BracketTeam;
  aName: string;
  bName: string;
  winner: MatchSide | null;
  court: number;
  courtLabel: string;
};

export type StandingRow = {
  rank: number;
  idx: number;
  name: string;
  wins: number;
  losses: number;
  record: string;
};

export type RoundRobinVM = {
  kind: "roundRobin";
  scheduleRounds: { label: string; matches: RoundRobinMatchVM[] }[];
  matches: RoundRobinMatchVM[];
  standings: StandingRow[];
};

export type BracketVM = EliminationVM | RoundRobinVM;

export type WheelSector = {
  key: string;
  path: string;
  color: string;
  label: string;
  labelX: number;
  labelY: number;
  rotate: number;
  boxX: number;
  boxY: number;
  boxW: number;
  boxH: number;
  fontSize: number;
};

export type WheelVM = {
  sectors: WheelSector[];
  hasPlayers: boolean;
};

export type SpinResult = {
  chosenIndex: number;
  chosenName: string;
  targetSlot: number;
  nextRotation: number;
};
