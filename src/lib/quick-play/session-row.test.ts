import { describe, expect, it } from "vitest";

import type { Tournament } from "@/lib/data/types";
import { createQuickPlaySession } from "@/lib/demo/quick-play";

import { fromQuickPlayRow, toQuickPlayRow } from "./session-row";

const OWNER = "6f1d5f6e-4a1b-4c2e-8f11-0b3c9d2e7a55";

/* A session mid-club-night: players added, teams named, everyone drawn and a
   first round played. */
function playedSession(): Tournament {
  return {
    ...createQuickPlaySession("Tuesday club night"),
    format: "double",
    teamCount: 4,
    courtCount: 4,
    playType: "singles",
    matchMinutes: 25,
    sessionMinutes: 180,
    teams: ["Ana", "Ben", "Cleo", "Dev"],
    teamPlayers: [["Ana"], ["Ben"], ["Cleo"], ["Dev"]],
    decisions: { "w-0-0": "a", "w-0-1": "b" },
    roster: [
      { name: "Ana", role: "player", skill: "intermediate" },
      { name: "Ben", role: "coach", skill: "advanced" },
      { name: "Cleo", role: "player", skill: "beginner" },
      { name: "Dev", role: "admin", skill: "intermediate" },
    ],
    assignedPlayerNames: ["Ana", "Ben", "Cleo", "Dev"],
  };
}

describe("toQuickPlayRow", () => {
  it("sends exactly the thirteen columns the client owns", () => {
    expect(Object.keys(toQuickPlayRow(playedSession(), OWNER)).sort()).toEqual([
      "assigned_player_names",
      "court_count",
      "decisions",
      "format",
      "match_minutes",
      "owner",
      "play_type",
      "roster",
      "session_minutes",
      "team_count",
      "team_players",
      "teams",
      "title",
    ]);
  });
});

describe("fromQuickPlayRow", () => {
  it("round-trips a played session, filler fields included", () => {
    const session = playedSession();
    const restored = fromQuickPlayRow(toQuickPlayRow(session, OWNER));

    expect(restored).toEqual(session);
    // The id comes back from createQuickPlaySession(), not the row — it is the
    // reducer's routing key. The name is the row's stored title.
    expect(restored?.id).toBe("quick-play");
    expect(restored?.name).toBe("Tuesday club night");
  });

  it("ignores the columns the client never sends", () => {
    const restored = fromQuickPlayRow({
      ...toQuickPlayRow(playedSession(), OWNER),
      created_at: "2026-08-20T10:00:00.000Z",
      updated_at: "2026-08-20T10:05:00.000Z",
    });

    expect(restored).toEqual(playedSession());
  });

  it("rejects a format the bracket engine does not know", () => {
    const row = { ...toQuickPlayRow(playedSession(), OWNER), format: "knockout" };
    expect(fromQuickPlayRow(row)).toBeNull();
  });

  it("rejects a title that is blank or too long", () => {
    const row = toQuickPlayRow(playedSession(), OWNER);
    expect(fromQuickPlayRow({ ...row, title: " " })).toBeNull();
    expect(fromQuickPlayRow({ ...row, title: "x".repeat(61) })).toBeNull();
  });

  it("rejects an unsupported team count", () => {
    const row = { ...toQuickPlayRow(playedSession(), OWNER), team_count: 12 };
    expect(fromQuickPlayRow(row)).toBeNull();
  });

  it("rejects collections that disagree with the team count", () => {
    const row = { ...toQuickPlayRow(playedSession(), OWNER), teams: ["Ana"] };
    expect(fromQuickPlayRow(row)).toBeNull();
  });

  it("rejects a recorded result that is neither side", () => {
    const row = {
      ...toQuickPlayRow(playedSession(), OWNER),
      decisions: { "w-0-0": "c" },
    };
    expect(fromQuickPlayRow(row)).toBeNull();
  });

  it("rejects anything that is not a row at all", () => {
    expect(fromQuickPlayRow(undefined)).toBeNull();
    expect(fromQuickPlayRow(null)).toBeNull();
    expect(fromQuickPlayRow({})).toBeNull();
    expect(fromQuickPlayRow("quick-play")).toBeNull();
  });
});
