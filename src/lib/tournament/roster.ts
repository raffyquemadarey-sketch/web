import type { RosterEntry, Tournament } from "@/lib/data/types";

import { teamDisplayName } from "./teams";

/* Hand-typed rosters, for the Quick Play whiteboard. Names are the identity of a
   player everywhere in the demo store — `RosterList` keys on them and
   `getRemainingPool` matches on them — so they are normalised on the way in and
   compared case-insensitively. */

/** Trim, and collapse runs of internal whitespace to a single space. */
export function normalisePlayerName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function isDuplicatePlayerName(
  existingNames: readonly string[],
  candidate: string,
): boolean {
  const needle = normalisePlayerName(candidate).toLowerCase();
  return existingNames.some(
    (name) => normalisePlayerName(name).toLowerCase() === needle,
  );
}

export function makePlayerEntry(name: string): RosterEntry {
  return {
    name: normalisePlayerName(name),
    role: "player",
    // Inert filler: `RosterEntry` requires a skill, but Quick Play has no
    // registration to collect one from and hides the skill line entirely.
    skill: "intermediate",
  };
}

/**
 * Pull a player out of the roster, the assigned pool and whichever team box they
 * were in. Only the teams that actually changed are renamed, so a hand-typed
 * name on another team survives.
 *
 * `decisions` is deliberately absent from the return: recorded winners are keyed
 * by match key and side, not by team name, and wiping them because someone fixed
 * a typo would silently destroy a played bracket. `setTeamName` sets the same
 * precedent.
 */
export function removePlayer(
  t: Tournament,
  name: string,
): Pick<Tournament, "roster" | "teams" | "teamPlayers" | "assignedPlayerNames"> {
  const teamPlayers = t.teamPlayers.map((players) =>
    players.filter((player) => player !== name),
  );

  return {
    roster: t.roster.filter((player) => player.name !== name),
    teamPlayers,
    teams: t.teams.map((team, i) =>
      teamPlayers[i].length === t.teamPlayers[i].length
        ? team
        : teamDisplayName(teamPlayers[i], i),
    ),
    assignedPlayerNames: t.assignedPlayerNames.filter(
      (assigned) => assigned !== name,
    ),
  };
}
