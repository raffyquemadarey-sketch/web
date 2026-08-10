import type { Tournament } from "@/lib/data/types";
import type { TournamentFormat } from "@/lib/validation/enums";

import { buildBracketVM } from "./bracket";
import { formatLabel } from "./labels";
import { makeEmptyTeamPlayers, makeTeams } from "./teams";
import type { MatchVM } from "./types";

/* How long a draw actually takes on the courts the admin has booked.
   `estimatedMinutes = Σ over sequential rounds of ceil(matchesInRound / courtCount) × matchMinutes`.

   Assumptions, all deliberate:
   (a) Rounds are sequential — round N cannot start until N-1 finishes. This is
       why the naive `totalMatches / courtCount` badly understates elimination,
       where the final is one match however many courts are free.
   (b) Every match takes the same `matchMinutes`. Changeovers, warm-ups and
       breaks are excluded, so a real event runs longer than the number shown.
   (c) The sum is order-independent, so winners, losers and grand-final rounds
       can be concatenated in any order without changing the result — there is
       no need to reconstruct `elimination.ts`'s interleaved play order.
   (d) Walkovers and void matches consume no court time and are excluded. */

export type ScheduleInput = {
  format: TournamentFormat;
  teamCount: number;
  courtCount: number;
  matchMinutes: number;
  sessionMinutes: number;
};

export type ScheduleEstimate = ScheduleInput & {
  /** Contested matches per sequential round. */
  roundSizes: number[];
  totalMatches: number;
  /** Σ ceil(size / courtCount): how many times the courts turn over. */
  courtSlots: number;
  estimatedMinutes: number;
  fitsInSession: boolean;
  overrunMinutes: number;
  spareMinutes: number;
  /** See `getRoundSizes`: a non-power-of-two double draw can only be bounded. */
  isUpperBound: boolean;
};

/** A throwaway tournament the bracket engine can chew on. Only `format`,
 *  `teamCount` and the derived `teams` affect the counts; everything else is
 *  filler, so the estimate never has to duplicate the engine's own maths. */
function probeTournament(format: TournamentFormat, teamCount: number): Tournament {
  return {
    id: "schedule-probe",
    name: "Schedule probe",
    dates: "",
    location: "",
    level: "",
    divisions: "",
    description: "",
    format,
    teamCount,
    courtCount: 4,
    playType: "singles",
    matchMinutes: 30,
    sessionMinutes: 240,
    teams: makeTeams(teamCount),
    teamPlayers: makeEmptyTeamPlayers(teamCount),
    decisions: {},
    roster: [],
    assignedPlayerNames: [],
  };
}

function isPowerOfTwo(n: number): boolean {
  return n >= 1 && (n & (n - 1)) === 0;
}

/** Matches in a round that will actually be played: a walkover advances a team
 *  without anyone stepping on court, and a void match is structural filler. */
function countContested(matches: readonly MatchVM[]): number {
  return matches.filter((m) => m.status !== "void" && m.status !== "walkover").length;
}

export function getRoundSizes(
  format: TournamentFormat,
  teamCount: number,
): number[] {
  // Below 2 teams there is no draw at all — the elimination engine still emits
  // one phantom match, which would read as a real fixture here.
  if (teamCount < 2) return [];

  const vm = buildBracketVM(probeTournament(format, teamCount));
  if (vm.kind === "roundRobin") {
    return vm.scheduleRounds.map((round) => round.matches.length);
  }

  const sizes = [
    ...vm.winnersRounds.map((round) => countContested(round.matches)),
    ...vm.losersRounds.map((round) => countContested(round.matches)),
  ];
  if (vm.grandFinal && vm.grandFinal.status !== "void") sizes.push(1);
  // A round in which nothing is contested is not a round anyone turns up for.
  // No supported team count produces one today; this keeps it that way.
  return sizes.filter((size) => size > 0);
}

export function estimateSchedule(input: ScheduleInput): ScheduleEstimate {
  const courts = Math.max(1, input.courtCount);
  const roundSizes = getRoundSizes(input.format, input.teamCount);
  const totalMatches = roundSizes.reduce((total, size) => total + size, 0);
  const courtSlots = roundSizes.reduce(
    (total, size) => total + Math.ceil(size / courts),
    0,
  );
  const estimatedMinutes = courtSlots * input.matchMinutes;

  return {
    ...input,
    roundSizes,
    totalMatches,
    courtSlots,
    estimatedMinutes,
    fitsInSession: estimatedMinutes <= input.sessionMinutes,
    overrunMinutes: Math.max(0, estimatedMinutes - input.sessionMinutes),
    spareMinutes: Math.max(0, input.sessionMinutes - estimatedMinutes),
    // A double-elimination draw that is not a power of two schedules losers
    // slots fed by a winners-bracket bye. Those are `pending` until results
    // land and only then resolve to walkovers, so the engine genuinely cannot
    // know in advance how many will be contested — 9 teams schedules 20 where
    // only 2n-2 = 16 can ever be played. The estimate is a ceiling, not a
    // forecast, and `describeSchedule` says so.
    isUpperBound:
      roundSizes.length > 0 &&
      input.format === "double" &&
      !isPowerOfTwo(input.teamCount),
  };
}

export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

export function describeSchedule(e: ScheduleEstimate): {
  summary: string;
  verdict: string;
} {
  if (e.roundSizes.length === 0) {
    return { summary: "Add at least 2 teams to estimate a schedule.", verdict: "" };
  }

  const summary =
    `${e.teamCount} teams, ${formatLabel(e.format).toLowerCase()} on ${e.courtCount} courts ` +
    `at ${e.matchMinutes} min ≈ ${formatDuration(e.estimatedMinutes)} — ` +
    `${e.totalMatches} matches over ${e.roundSizes.length} rounds.` +
    (e.isUpperBound ? " Byes may make it shorter." : "");

  if (e.overrunMinutes > 0) {
    return {
      summary,
      verdict: `That's ${formatDuration(e.overrunMinutes)} longer than your ${formatDuration(e.sessionMinutes)} session — add courts, shorten matches, or cut the team count.`,
    };
  }
  if (e.estimatedMinutes === e.sessionMinutes) {
    return {
      summary,
      verdict: `That exactly fills your ${formatDuration(e.sessionMinutes)} session.`,
    };
  }
  return {
    summary,
    verdict: `Your ${formatDuration(e.sessionMinutes)} session leaves ${formatDuration(e.spareMinutes)} spare.`,
  };
}
