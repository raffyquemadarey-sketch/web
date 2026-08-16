import type {
  AccountRole,
  MatchSide,
  PlayType,
  SkillLevel,
  TournamentFormat,
} from "@/lib/validation/enums";

export type RosterEntry = {
  name: string;
  role: AccountRole;
  skill: SkillLevel;
};

/** Recorded winners, keyed by match key (`w-0-1`, `l-2-0`, `gf`, `rr-0-3`). */
export type DecisionMap = Record<string, MatchSide>;

export type Tournament = {
  id: string;
  name: string;
  /** ISO `YYYY-MM-DD`, a local calendar date. Never parse with `new Date()` —
      that reads it as UTC midnight. Format via `formatTournamentDates`. */
  startDate: string;
  /** ISO `YYYY-MM-DD`, or `null` for a one-day event. */
  endDate: string | null;
  location: string;
  level: string;
  divisions: string;
  description: string;
  format: TournamentFormat;
  teamCount: number;
  courtCount: number;
  playType: PlayType;
  /** Minutes one match occupies a court. */
  matchMinutes: number;
  /** Minutes of court time available in one playing session. */
  sessionMinutes: number;
  teams: string[];
  teamPlayers: string[][];
  decisions: DecisionMap;
  roster: RosterEntry[];
  assignedPlayerNames: string[];
};
