import { TEAM_COUNT_OPTIONS } from "@/lib/data/fixtures";
import type { PlayType } from "@/lib/validation/enums";

import { getCapacity } from "./teams";

/* Roster ↔ team-count maths, and the plain-English sentences the admin reads.
   Everything here is advisory: a mismatch is a configuration the admin is free
   to keep, so nothing in this module decides anything on their behalf.

   Rounding is always *up* (`ceil`): a spare slot degrades to a bye the bracket
   engine already handles, whereas a player with no slot simply cannot compete. */

export type TeamCountSuggestion = {
  playerCount: number;
  /** Players per team, from `getCapacity(playType)`. */
  capacity: number;
  /** `ceil(playerCount / capacity)`, before snapping to a supported size. */
  ideal: number;
  /** `ideal` snapped into TEAM_COUNT_OPTIONS. */
  suggested: number;
  clamp: "none" | "min" | "max" | "rounded";
};

export type RosterFit = {
  suggestion: TeamCountSuggestion;
  teamCount: number;
  /** `teamCount * capacity`. */
  slots: number;
  emptySlots: number;
  unplacedPlayers: number;
  status: "empty" | "balanced" | "underfilled" | "overfilled";
};

const OPTIONS: readonly number[] = TEAM_COUNT_OPTIONS;
const MIN_OPTION = Math.min(...OPTIONS);
const MAX_OPTION = Math.max(...OPTIONS);

/** Garbage in (negative, NaN, fractional) still has to produce a usable number. */
function normalisePlayerCount(playerCount: number): number {
  if (!Number.isFinite(playerCount)) return 0;
  return Math.max(0, Math.floor(playerCount));
}

export function suggestTeamCount(
  playerCount: number,
  playType: PlayType,
): TeamCountSuggestion {
  const players = normalisePlayerCount(playerCount);
  const capacity = getCapacity(playType);
  const ideal = Math.ceil(players / capacity);

  let suggested: number;
  let clamp: TeamCountSuggestion["clamp"];
  if (ideal <= MIN_OPTION) {
    suggested = MIN_OPTION;
    clamp = ideal === MIN_OPTION ? "none" : "min";
  } else if (ideal > MAX_OPTION) {
    suggested = MAX_OPTION;
    clamp = "max";
  } else {
    suggested = OPTIONS.filter((n) => n >= ideal).reduce((a, b) => Math.min(a, b));
    clamp = suggested === ideal ? "none" : "rounded";
  }

  return { playerCount: players, capacity, ideal, suggested, clamp };
}

export function getRosterFit(input: {
  playerCount: number;
  playType: PlayType;
  teamCount: number;
}): RosterFit {
  const suggestion = suggestTeamCount(input.playerCount, input.playType);
  const slots = input.teamCount * suggestion.capacity;
  const emptySlots = Math.max(0, slots - suggestion.playerCount);
  const unplacedPlayers = Math.max(0, suggestion.playerCount - slots);

  const status: RosterFit["status"] =
    suggestion.playerCount === 0
      ? "empty"
      : unplacedPlayers > 0
        ? "overfilled"
        : emptySlots > 0
          ? "underfilled"
          : "balanced";

  return {
    suggestion,
    teamCount: input.teamCount,
    slots,
    emptySlots,
    unplacedPlayers,
    status,
  };
}

export function describeRosterFit(fit: RosterFit): string {
  const { playerCount, capacity } = fit.suggestion;
  // `getCapacity` is a two-value mapping, so the play type reads straight back
  // out of it — no need to carry the enum through every derived shape.
  const playType: PlayType = capacity === 2 ? "doubles" : "singles";

  switch (fit.status) {
    case "empty":
      return `No players have registered yet. ${fit.teamCount} ${playType} teams will need ${fit.slots} players.`;
    case "balanced":
      return `${playerCount} players, ${playType} — exactly fills ${fit.teamCount} teams of ${capacity}.`;
    case "underfilled":
      return `${fit.teamCount} teams of ${capacity} needs ${fit.slots} players. ${playerCount} have registered, so ${fit.emptySlots} slots will stay empty.`;
    case "overfilled":
      return `${playerCount} players won't fit in ${fit.teamCount} ${playType} teams (${fit.slots} slots) — ${fit.unplacedPlayers} players have no place.`;
  }
}

/** `null` for an empty roster — suggesting a size for nobody is just noise.
 *  Whether `suggested` differs from the current count is the caller's call. */
export function describeSuggestion(s: TeamCountSuggestion): string | null {
  if (s.playerCount === 0) return null;

  switch (s.clamp) {
    case "none":
      return `Suggested: ${s.suggested} teams.`;
    case "min":
      return `Suggested: ${s.suggested} teams — the fewest supported.`;
    case "max":
      return `Suggested: ${s.suggested} teams — the most supported.`;
    case "rounded":
      return `Suggested: ${s.suggested} teams — ${s.ideal} isn't a supported size.`;
  }
}
