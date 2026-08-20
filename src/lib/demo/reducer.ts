import type { RosterEntry, Tournament } from "@/lib/data/types";
import { removePlayer } from "@/lib/tournament/roster";
import {
  getCapacity,
  makeEmptyTeamPlayers,
  makeTeams,
  teamDisplayName,
} from "@/lib/tournament/teams";
import type {
  MatchSide,
  PlayType,
  TournamentFormat,
} from "@/lib/validation/enums";

import { QUICK_PLAY_ID, createQuickPlaySession } from "./quick-play";

export type DemoState = {
  tournaments: Tournament[];
  /** The uuid of the saved quick play currently open, or null when none is. Set
   *  by `openQuickPlay`; `restoreQuickPlay` refuses to write into a slot that
   *  has moved on. */
  quickPlayId: string | null;
  /** The Quick Play whiteboard session — see `patch` below for why it is here
   *  and not in `tournaments`. */
  quickPlay: Tournament;
  /** True once the user has changed the whiteboard in this tab. Gates both the
   *  save (never write a sheet nobody touched) and the restore (never clobber
   *  work the user already started). */
  quickPlayDirty: boolean;
};

export type DemoAction =
  | { type: "create"; tournament: Tournament }
  | { type: "setDecision"; id: string; key: string; side: MatchSide }
  | { type: "setTeamName"; id: string; index: number; name: string }
  | { type: "setFormat"; id: string; format: TournamentFormat }
  | { type: "setTeamCount"; id: string; teamCount: number }
  | { type: "setPlayType"; id: string; playType: PlayType }
  | { type: "setCourtCount"; id: string; courtCount: number }
  | { type: "setMatchMinutes"; id: string; matchMinutes: number }
  | { type: "setSessionMinutes"; id: string; sessionMinutes: number }
  /** `pool` is pre-shuffled by the caller so the reducer stays pure. */
  | { type: "shuffleIntoTeams"; id: string; pool: string[] }
  | { type: "assignPlayer"; id: string; name: string }
  | { type: "resetAssignments"; id: string }
  | { type: "addRosterEntry"; id: string; entry: RosterEntry }
  | { type: "removeRosterEntry"; id: string; name: string }
  /** Binds the whiteboard slot to one saved quick play. */
  | { type: "openQuickPlay"; id: string }
  /** The saved sheet coming back from Supabase. Declines when the tab is
   *  already dirty, so a slow load cannot overwrite work in progress. */
  | { type: "restoreQuickPlay"; id: string; session: Tournament }
  | { type: "resetQuickPlay" };

/**
 * Every action but `create` funnels through here, which is what lets the Quick
 * Play session reuse all of them. One reserved id — `QUICK_PLAY_ID` — routes to
 * the whiteboard slot instead of the tournaments array; the session is never in
 * `state.tournaments`, so it cannot reach `useDemoTournaments()` and therefore
 * cannot appear in any tournament listing, now or in future.
 */
function patch(
  state: DemoState,
  id: string,
  update: (t: Tournament) => Partial<Tournament>,
): DemoState {
  if (id === QUICK_PLAY_ID) {
    return {
      ...state,
      quickPlay: { ...state.quickPlay, ...update(state.quickPlay) },
      quickPlayDirty: true,
    };
  }
  return {
    ...state,
    tournaments: state.tournaments.map((t) =>
      t.id === id ? { ...t, ...update(t) } : t,
    ),
  };
}

function fillTeams(
  t: Tournament,
  names: readonly string[],
): Partial<Tournament> {
  const capacity = getCapacity(t.playType);
  const teamPlayers = t.teamPlayers.map((players) => [...players]);
  const assignedPlayerNames = [...t.assignedPlayerNames];
  let p = 0;
  for (let i = 0; i < teamPlayers.length && p < names.length; i++) {
    while (teamPlayers[i].length < capacity && p < names.length) {
      teamPlayers[i].push(names[p]);
      assignedPlayerNames.push(names[p]);
      p++;
    }
  }
  return {
    teamPlayers,
    teams: teamPlayers.map((players, i) => teamDisplayName(players, i)),
    assignedPlayerNames,
  };
}

export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case "create":
      return { ...state, tournaments: [...state.tournaments, action.tournament] };

    case "setDecision":
      return patch(state, action.id, (t) => ({
        decisions: { ...t.decisions, [action.key]: action.side },
      }));

    case "setTeamName":
      return patch(state, action.id, (t) => {
        const teams = [...t.teams];
        teams[action.index] = action.name;
        const teamPlayers = t.teamPlayers.map((players) => [...players]);
        const trimmed = action.name.trim();
        teamPlayers[action.index] = trimmed ? [trimmed] : [];
        return { teams, teamPlayers };
      });

    // Changing the shape of the draw invalidates recorded results.
    case "setFormat":
      return patch(state, action.id, () => ({
        format: action.format,
        decisions: {},
      }));

    case "setTeamCount":
      return patch(state, action.id, () => ({
        teamCount: action.teamCount,
        teams: makeTeams(action.teamCount),
        teamPlayers: makeEmptyTeamPlayers(action.teamCount),
        assignedPlayerNames: [],
        decisions: {},
      }));

    case "setPlayType":
      return patch(state, action.id, (t) => ({
        playType: action.playType,
        teams: makeTeams(t.teamCount),
        teamPlayers: makeEmptyTeamPlayers(t.teamCount),
        assignedPlayerNames: [],
        decisions: {},
      }));

    // Court count, match length and session length are wall-clock scheduling
    // settings rather than the shape of the draw, so recorded results survive.
    case "setCourtCount":
      return patch(state, action.id, () => ({ courtCount: action.courtCount }));

    case "setMatchMinutes":
      return patch(state, action.id, () => ({ matchMinutes: action.matchMinutes }));

    case "setSessionMinutes":
      return patch(state, action.id, () => ({
        sessionMinutes: action.sessionMinutes,
      }));

    case "shuffleIntoTeams":
      return patch(state, action.id, (t) => fillTeams(t, action.pool));

    case "assignPlayer":
      return patch(state, action.id, (t) => fillTeams(t, [action.name]));

    case "resetAssignments":
      return patch(state, action.id, (t) => ({
        teams: makeTeams(t.teamCount),
        teamPlayers: makeEmptyTeamPlayers(t.teamCount),
        assignedPlayerNames: [],
      }));

    case "addRosterEntry":
      return patch(state, action.id, (t) => ({
        roster: [...t.roster, action.entry],
      }));

    // Removing a player also empties their team slot, but leaves results alone —
    // see `removePlayer`.
    case "removeRosterEntry":
      return patch(state, action.id, (t) => removePlayer(t, action.name));

    // Binding the whiteboard slot to one saved row. Unconditionally clears the
    // slot, including for the id already open: the sync provider is remounted
    // per id and re-reads the row, so anything left here would be stale, and a
    // stale dirty flag would raise a conflict against a sheet this tab wrote
    // itself. Unsaved edits are not lost — the provider flushes on unmount.
    case "openQuickPlay":
      return {
        ...state,
        quickPlayId: action.id,
        quickPlay: createQuickPlaySession(),
        quickPlayDirty: false,
      };

    // Restoring is not an edit, so the sheet stays clean afterwards: it matches
    // what is already stored and there is nothing new to write back.
    case "restoreQuickPlay":
      // A load that resolved after the user opened a different quick play.
      if (state.quickPlayId !== action.id) return state;
      if (state.quickPlayDirty) return state;
      return { ...state, quickPlay: action.session };

    // Wiping is an edit — the empty sheet has to reach the stored row, or the
    // next reload brings tonight's players back. The title survives — the row
    // is not being deleted, only emptied.
    case "resetQuickPlay":
      return {
        ...state,
        quickPlay: createQuickPlaySession(state.quickPlay.name),
        quickPlayDirty: true,
      };
  }
}
