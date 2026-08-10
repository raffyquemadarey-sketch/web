/**
 * The Supabase swap seam.
 *
 * Every read of tournament data goes through this module. Today it returns deep
 * copies of the in-memory fixtures; when a backend lands, these functions become
 * Supabase queries and nothing above them has to change. No component imports
 * `fixtures` directly.
 */

import { seedTournaments } from "./fixtures";
import type { Tournament } from "./types";

export const DEMO_ID_PREFIX = "demo-";

const DEMO_ID_PATTERN = /^demo-[a-z0-9]+$/;

function cloneTournament(t: Tournament): Tournament {
  return {
    ...t,
    teams: [...t.teams],
    teamPlayers: t.teamPlayers.map((players) => [...players]),
    decisions: { ...t.decisions },
    roster: t.roster.map((entry) => ({ ...entry })),
    assignedPlayerNames: [...t.assignedPlayerNames],
  };
}

export async function listTournaments(): Promise<Tournament[]> {
  return seedTournaments.map(cloneTournament);
}

export async function getTournamentById(id: string): Promise<Tournament | null> {
  const found = seedTournaments.find((t) => t.id === id);
  return found ? cloneTournament(found) : null;
}

/** True for ids minted by the demo admin flow, which live only in client memory. */
export function isDemoCreatedId(id: string): boolean {
  return DEMO_ID_PATTERN.test(id);
}

/** Call from event handlers only — never during render. */
export function newDemoTournamentId(): string {
  return `${DEMO_ID_PREFIX}${Date.now().toString(36)}`;
}

/**
 * A route exists when it names a seed tournament or looks like a demo-created id.
 * The server cannot see the client store, so demo ids are accepted on shape alone
 * and the client renders an honest "no longer in memory" notice if the store is
 * empty. Anything else is a real 404.
 */
export async function tournamentRouteExists(id: string): Promise<boolean> {
  if (isDemoCreatedId(id)) return true;
  return seedTournaments.some((t) => t.id === id);
}
