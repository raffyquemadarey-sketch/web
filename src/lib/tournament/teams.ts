import type { Tournament } from "@/lib/data/types";
import type { PlayType } from "@/lib/validation/enums";

export function makeTeams(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `Team ${i + 1}`);
}

export function makeEmptyTeamPlayers(n: number): string[][] {
  return Array.from({ length: n }, () => []);
}

export function resizeTeams(teams: readonly string[], n: number): string[] {
  if (n <= teams.length) return teams.slice(0, n);
  const extra = Array.from(
    { length: n - teams.length },
    (_, i) => `Team ${teams.length + i + 1}`,
  );
  return teams.concat(extra);
}

/** Players per team: doubles pairs up, singles does not. */
export function getCapacity(playType: PlayType): number {
  return playType === "doubles" ? 2 : 1;
}

export function teamDisplayName(players: readonly string[], idx: number): string {
  return players.length ? players.join(" / ") : `Team ${idx + 1}`;
}

/** Roster names that are not yet on a team. */
export function getRemainingPool(t: Tournament): string[] {
  return t.roster
    .map((p) => p.name)
    .filter((name) => !t.assignedPlayerNames.includes(name));
}

export function hasEmptySlot(t: Tournament): boolean {
  const capacity = getCapacity(t.playType);
  return t.teamPlayers.some((players) => players.length < capacity);
}
