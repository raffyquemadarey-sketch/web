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
};

export type RoundVM = {
  label: string;
  matches: MatchVM[];
  height: number;
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
