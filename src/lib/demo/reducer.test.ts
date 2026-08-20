import { describe, expect, it } from "vitest";

import type { Tournament } from "@/lib/data/types";
import { makeEmptyTeamPlayers, makeTeams } from "@/lib/tournament/teams";

import { QUICK_PLAY_ID, createQuickPlaySession } from "./quick-play";
import { demoReducer } from "./reducer";
import type { DemoState } from "./reducer";

/* Two saved quick plays. Row ids are uuids from Postgres, never `QUICK_PLAY_ID`
   — that one stays the reducer's routing key and never leaves the client. */
const OPEN_ID = "3b9d1f2a-6c4e-4f18-9a77-1d0e5c8b2a34";
const OTHER_ID = "b17c4e0d-2f5a-4c93-8e61-7a2d4f0b9c18";

function makeTournament(overrides: Partial<Tournament> = {}): Tournament {
  return {
    id: "autumn-open",
    name: "Autumn Open",
    startDate: "2026-01-01",
    endDate: null,
    location: "Test hall",
    level: "All levels",
    divisions: "Singles",
    description: "",
    format: "single",
    teamCount: 4,
    courtCount: 2,
    playType: "doubles",
    matchMinutes: 30,
    sessionMinutes: 240,
    teams: makeTeams(4),
    teamPlayers: makeEmptyTeamPlayers(4),
    decisions: {},
    roster: [],
    assignedPlayerNames: [],
    ...overrides,
  };
}

function makeState(overrides: Partial<DemoState> = {}): DemoState {
  return {
    tournaments: [makeTournament()],
    quickPlayId: null,
    quickPlay: createQuickPlaySession(),
    quickPlayDirty: false,
    ...overrides,
  };
}

describe("demoReducer id routing", () => {
  it("writes the reserved id to the whiteboard slot, never the tournaments array", () => {
    const state = makeState();
    const next = demoReducer(state, {
      type: "setTeamCount",
      id: QUICK_PLAY_ID,
      teamCount: 8,
    });

    expect(next.quickPlay.teamCount).toBe(8);
    expect(next.tournaments).toBe(state.tournaments);
    expect(next.tournaments.some((t) => t.id === QUICK_PLAY_ID)).toBe(false);
  });

  it("records a Quick Play result without touching the tournaments array", () => {
    const next = demoReducer(makeState(), {
      type: "setDecision",
      id: QUICK_PLAY_ID,
      key: "w-0-0",
      side: "a",
    });

    expect(next.quickPlay.decisions).toEqual({ "w-0-0": "a" });
    expect(next.tournaments[0].decisions).toEqual({});
  });

  it("leaves the whiteboard slot untouched when a real tournament is patched", () => {
    const state = makeState();
    const next = demoReducer(state, {
      type: "setTeamCount",
      id: "autumn-open",
      teamCount: 8,
    });

    expect(next.tournaments[0].teamCount).toBe(8);
    expect(next.quickPlay).toBe(state.quickPlay);
  });

  it("preserves the whiteboard slot when a tournament is created", () => {
    const state = makeState();
    const next = demoReducer(state, {
      type: "create",
      tournament: makeTournament({ id: "demo-abc123", name: "Demo" }),
    });

    expect(next.tournaments).toHaveLength(2);
    expect(next.quickPlay).toBe(state.quickPlay);
  });
});

describe("demoReducer roster entries", () => {
  it("round-trips a Quick Play roster through add and remove", () => {
    const added = demoReducer(makeState(), {
      type: "addRosterEntry",
      id: QUICK_PLAY_ID,
      entry: { name: "Jordan Lee", role: "player", skill: "intermediate" },
    });
    expect(added.quickPlay.roster.map((p) => p.name)).toEqual(["Jordan Lee"]);

    const removed = demoReducer(added, {
      type: "removeRosterEntry",
      id: QUICK_PLAY_ID,
      name: "Jordan Lee",
    });
    expect(removed.quickPlay.roster).toEqual([]);
  });

  it("keeps recorded results when a player is removed", () => {
    const state = makeState({
      quickPlay: {
        ...createQuickPlaySession(),
        roster: [{ name: "Ana", role: "player", skill: "intermediate" }],
        teams: ["Ana", "Team 2", "Team 3", "Team 4"],
        teamPlayers: [["Ana"], [], [], []],
        assignedPlayerNames: ["Ana"],
        decisions: { "w-0-0": "a" },
      },
    });

    const next = demoReducer(state, {
      type: "removeRosterEntry",
      id: QUICK_PLAY_ID,
      name: "Ana",
    });

    expect(next.quickPlay.teams).toEqual(["Team 1", "Team 2", "Team 3", "Team 4"]);
    expect(next.quickPlay.assignedPlayerNames).toEqual([]);
    expect(next.quickPlay.decisions).toEqual({ "w-0-0": "a" });
  });
});

describe("demoReducer reset semantics on the whiteboard", () => {
  const played = () =>
    makeState({
      quickPlay: { ...createQuickPlaySession(), decisions: { "w-0-0": "a" } },
    });

  it("clears results when the shape of the draw changes", () => {
    const next = demoReducer(played(), {
      type: "setFormat",
      id: QUICK_PLAY_ID,
      format: "roundrobin",
    });
    expect(next.quickPlay.decisions).toEqual({});
  });

  it("keeps results when only the scheduling changes", () => {
    const next = demoReducer(played(), {
      type: "setCourtCount",
      id: QUICK_PLAY_ID,
      courtCount: 4,
    });
    expect(next.quickPlay.decisions).toEqual({ "w-0-0": "a" });
  });
});

describe("demoReducer quick play persistence flags", () => {
  const saved = (): Tournament => ({
    ...createQuickPlaySession(),
    roster: [{ name: "Ana", role: "player", skill: "intermediate" }],
  });

  it("marks the sheet dirty on any whiteboard change", () => {
    const next = demoReducer(makeState(), {
      type: "addRosterEntry",
      id: QUICK_PLAY_ID,
      entry: { name: "Ana", role: "player", skill: "intermediate" },
    });
    expect(next.quickPlayDirty).toBe(true);
  });

  it("leaves the sheet clean when a real tournament changes", () => {
    const next = demoReducer(makeState(), {
      type: "setTeamCount",
      id: "autumn-open",
      teamCount: 8,
    });
    expect(next.quickPlayDirty).toBe(false);
  });

  it("restores a saved sheet into a clean tab without dirtying it", () => {
    const next = demoReducer(makeState({ quickPlayId: OPEN_ID }), {
      type: "restoreQuickPlay",
      id: OPEN_ID,
      session: saved(),
    });

    expect(next.quickPlay.roster.map((p) => p.name)).toEqual(["Ana"]);
    expect(next.quickPlayDirty).toBe(false);
  });

  it("declines to restore over work already started in this tab", () => {
    const state = makeState({ quickPlayId: OPEN_ID, quickPlayDirty: true });
    const next = demoReducer(state, {
      type: "restoreQuickPlay",
      id: OPEN_ID,
      session: saved(),
    });

    expect(next).toBe(state);
  });

  it("wipes the sheet and marks it dirty so the empty sheet gets written", () => {
    const state = makeState({ quickPlay: saved(), quickPlayDirty: true });
    const next = demoReducer(state, { type: "resetQuickPlay" });

    expect(next.quickPlay).toEqual(createQuickPlaySession());
    expect(next.quickPlayDirty).toBe(true);
  });

  it("keeps the title when the sheet is wiped — the row is emptied, not deleted", () => {
    const state = makeState({
      quickPlay: {
        ...createQuickPlaySession("Tuesday club night"),
        roster: [{ name: "Ana", role: "player", skill: "intermediate" }],
      },
      quickPlayDirty: true,
    });
    const next = demoReducer(state, { type: "resetQuickPlay" });

    expect(next.quickPlay.name).toBe("Tuesday club night");
    expect(next.quickPlay.roster).toEqual([]);
  });
});

describe("demoReducer quick play slot binding", () => {
  it("binds the slot to a saved row without touching the tournaments array", () => {
    const state = makeState();
    const next = demoReducer(state, { type: "openQuickPlay", id: OPEN_ID });

    expect(next.quickPlayId).toBe(OPEN_ID);
    expect(next.tournaments).toBe(state.tournaments);
  });

  it("clears the previous quick play's sheet on the way into the next one", () => {
    const state = makeState({
      quickPlayId: OPEN_ID,
      quickPlay: {
        ...createQuickPlaySession("Tuesday club night"),
        roster: [{ name: "Ana", role: "player", skill: "intermediate" }],
      },
      quickPlayDirty: true,
    });
    const next = demoReducer(state, { type: "openQuickPlay", id: OTHER_ID });

    expect(next.quickPlayId).toBe(OTHER_ID);
    expect(next.quickPlay).toEqual(createQuickPlaySession());
    expect(next.quickPlayDirty).toBe(false);
  });

  it("ignores a load that resolved after another quick play was opened", () => {
    const state = makeState({ quickPlayId: OTHER_ID });
    const next = demoReducer(state, {
      type: "restoreQuickPlay",
      id: OPEN_ID,
      session: createQuickPlaySession("Tuesday club night"),
    });

    expect(next).toBe(state);
  });
});
