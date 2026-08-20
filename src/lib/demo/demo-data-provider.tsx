"use client";

/**
 * In-memory tournament store for the demo build. Everything lives in React state
 * and is still the sole source of truth for rendering, so the UI never waits on
 * a network round trip. Reads that need to survive a reload go through
 * `@/lib/data/repository` instead.
 *
 * One exception to "resets on reload": the `quickPlay` slot holds whichever
 * saved quick play is open, and `QuickPlaySyncProvider` mirrors it to that row —
 * restoring it through `restoreQuickPlay` and writing it back as it changes.
 * Tournaments and registrations are not persisted and still reset.
 */

import { createContext, useContext, useReducer } from "react";
import type { ReactNode } from "react";

import type { RosterEntry, Tournament } from "@/lib/data/types";
import type {
  MatchSide,
  PlayType,
  TournamentFormat,
} from "@/lib/validation/enums";

import { createQuickPlaySession } from "./quick-play";
import { demoReducer } from "./reducer";
import type { DemoState } from "./reducer";

type DemoActions = {
  createTournament: (tournament: Tournament) => void;
  setDecision: (id: string, key: string, side: MatchSide) => void;
  setTeamName: (id: string, index: number, name: string) => void;
  setFormat: (id: string, format: TournamentFormat) => void;
  setTeamCount: (id: string, teamCount: number) => void;
  setPlayType: (id: string, playType: PlayType) => void;
  setCourtCount: (id: string, courtCount: number) => void;
  setMatchMinutes: (id: string, matchMinutes: number) => void;
  setSessionMinutes: (id: string, sessionMinutes: number) => void;
  shuffleIntoTeams: (id: string, pool: string[]) => void;
  assignPlayer: (id: string, name: string) => void;
  resetAssignments: (id: string) => void;
  addRosterEntry: (id: string, entry: RosterEntry) => void;
  removeRosterEntry: (id: string, name: string) => void;
  openQuickPlay: (id: string) => void;
  restoreQuickPlay: (id: string, session: Tournament) => void;
  resetQuickPlay: () => void;
};

type DemoDataValue = {
  tournaments: Tournament[];
  /** The uuid of the saved quick play currently open, or null when none is. */
  quickPlayId: string | null;
  /** The Quick Play whiteboard, held apart from `tournaments` on purpose. */
  quickPlay: Tournament;
  /** Whether the whiteboard has been touched in this tab — see `DemoState`. */
  quickPlayDirty: boolean;
  getTournament: (id: string) => Tournament | null;
  actions: DemoActions;
};

const DemoDataContext = createContext<DemoDataValue | null>(null);

export function DemoDataProvider({
  initialTournaments,
  children,
}: {
  initialTournaments: Tournament[];
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(demoReducer, {
    tournaments: initialTournaments,
    quickPlayId: null,
    quickPlay: createQuickPlaySession(),
    quickPlayDirty: false,
  } satisfies DemoState);

  const value: DemoDataValue = {
    tournaments: state.tournaments,
    quickPlayId: state.quickPlayId,
    quickPlay: state.quickPlay,
    quickPlayDirty: state.quickPlayDirty,
    // Searches `tournaments` only, so `QUICK_PLAY_ID` never resolves here — the
    // whiteboard is reached through `useQuickPlay()` and nothing else.
    getTournament: (id) => state.tournaments.find((t) => t.id === id) ?? null,
    actions: {
      createTournament: (tournament) => dispatch({ type: "create", tournament }),
      setDecision: (id, key, side) =>
        dispatch({ type: "setDecision", id, key, side }),
      setTeamName: (id, index, name) =>
        dispatch({ type: "setTeamName", id, index, name }),
      setFormat: (id, format) => dispatch({ type: "setFormat", id, format }),
      setTeamCount: (id, teamCount) =>
        dispatch({ type: "setTeamCount", id, teamCount }),
      setPlayType: (id, playType) => dispatch({ type: "setPlayType", id, playType }),
      setCourtCount: (id, courtCount) =>
        dispatch({ type: "setCourtCount", id, courtCount }),
      setMatchMinutes: (id, matchMinutes) =>
        dispatch({ type: "setMatchMinutes", id, matchMinutes }),
      setSessionMinutes: (id, sessionMinutes) =>
        dispatch({ type: "setSessionMinutes", id, sessionMinutes }),
      shuffleIntoTeams: (id, pool) =>
        dispatch({ type: "shuffleIntoTeams", id, pool }),
      assignPlayer: (id, name) => dispatch({ type: "assignPlayer", id, name }),
      resetAssignments: (id) => dispatch({ type: "resetAssignments", id }),
      addRosterEntry: (id, entry) =>
        dispatch({ type: "addRosterEntry", id, entry }),
      removeRosterEntry: (id, name) =>
        dispatch({ type: "removeRosterEntry", id, name }),
      openQuickPlay: (id) => dispatch({ type: "openQuickPlay", id }),
      restoreQuickPlay: (id, session) =>
        dispatch({ type: "restoreQuickPlay", id, session }),
      resetQuickPlay: () => dispatch({ type: "resetQuickPlay" }),
    },
  };

  return (
    <DemoDataContext.Provider value={value}>{children}</DemoDataContext.Provider>
  );
}

function useDemoData(): DemoDataValue {
  const value = useContext(DemoDataContext);
  if (!value) {
    throw new Error("useDemoData must be used inside <DemoDataProvider>.");
  }
  return value;
}

export function useDemoTournaments(): Tournament[] {
  return useDemoData().tournaments;
}

export function useDemoTournament(id: string): Tournament | null {
  return useDemoData().getTournament(id);
}

export function useQuickPlay(): Tournament {
  return useDemoData().quickPlay;
}

export function useQuickPlayId(): string | null {
  return useDemoData().quickPlayId;
}

export function useQuickPlayDirty(): boolean {
  return useDemoData().quickPlayDirty;
}

export function useDemoActions(): DemoActions {
  return useDemoData().actions;
}
