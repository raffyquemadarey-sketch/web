import type { Tournament } from "@/lib/data/types";
import type {
  AccountRole,
  SkillLevel,
  TournamentFormat,
} from "@/lib/validation/enums";

export function roundLabel(matchCount: number): string {
  if (matchCount === 1) return "Final";
  if (matchCount === 2) return "Semifinals";
  if (matchCount === 4) return "Quarterfinals";
  return `Round of ${matchCount * 2}`;
}

export function formatLabel(format: TournamentFormat): string {
  switch (format) {
    case "single":
      return "Single elimination";
    case "double":
      return "Double elimination";
    case "roundrobin":
      return "Round robin";
  }
}

export function roleLabel(role: AccountRole): string {
  switch (role) {
    case "player":
      return "Player";
    case "coach":
      return "Coach";
    case "admin":
      return "Club admin";
  }
}

export function skillLabel(skill: SkillLevel): string {
  switch (skill) {
    case "beginner":
      return "Beginner";
    case "intermediate":
      return "Intermediate";
    case "advanced":
      return "Advanced";
  }
}

export function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function bracketFormatLabel(t: Tournament): string {
  return `${formatLabel(t.format)} · ${t.teamCount} teams`;
}
