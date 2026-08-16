import type { Tournament } from "@/lib/data/types";
import { makeEmptyTeamPlayers, makeTeams } from "@/lib/tournament/teams";

/**
 * The Quick Play whiteboard session.
 *
 * It is `Tournament`-shaped so that every existing component and helper —
 * `TeamAssignment`, `TournamentSettings`, `buildBracketVM`, `getRemainingPool` —
 * takes it unchanged. The price is seven fields it never uses; they are inert
 * filler, exactly as in `probeTournament` in `@/lib/tournament/schedule`, and
 * nothing on `/quick-play` renders them.
 *
 * `QUICK_PLAY_ID` is a reserved id: `demoReducer`'s `patch` routes it to the
 * `quickPlay` slot on `DemoState` instead of `state.tournaments`. The session is
 * therefore never in the tournaments array, which is what makes it impossible
 * for it to surface in `/tournaments`, `/admin` or the dashboard. Never push
 * this object into `state.tournaments`.
 *
 * Deterministic on purpose: it is evaluated during render on both the server and
 * the client, so no `Date.now()` and no `Math.random()`.
 */
export const QUICK_PLAY_ID = "quick-play";

const DEFAULT_TEAM_COUNT = 4;

export function createQuickPlaySession(): Tournament {
  return {
    id: QUICK_PLAY_ID,
    // Never displayed as a title — kept for a11y and debugging only.
    name: "Quick Play",
    startDate: "",
    endDate: null,
    location: "",
    level: "",
    divisions: "",
    description: "",
    format: "single",
    teamCount: DEFAULT_TEAM_COUNT,
    courtCount: 2,
    playType: "doubles",
    matchMinutes: 20,
    sessionMinutes: 120,
    teams: makeTeams(DEFAULT_TEAM_COUNT),
    teamPlayers: makeEmptyTeamPlayers(DEFAULT_TEAM_COUNT),
    decisions: {},
    roster: [],
    assignedPlayerNames: [],
  };
}
