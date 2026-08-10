"use client";

/**
 * In-memory tournament store for the demo build. Everything lives in React state
 * and resets on reload; there is no backend behind it. Reads that need to survive
 * a reload go through `@/lib/data/repository` instead.
 */

import { createContext, useContext, useReducer } from "react";
import type { ReactNode } from "react";

import type { RosterEntry, Tournament } from "@/lib/data/types";
import type {
  MatchSide,
  PlayType,
  TournamentFormat,
} from "@/lib/validation/enums";

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
};

type DemoDataValue = {
  tournaments: Tournament[];
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
  } satisfies DemoState);

  const value: DemoDataValue = {
    tournaments: state.tournaments,
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

export function useDemoActions(): DemoActions {
  return useDemoData().actions;
}
