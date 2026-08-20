import { z } from "zod";

import type { Tournament } from "@/lib/data/types";
import { createQuickPlaySession } from "@/lib/demo/quick-play";
import type { Database } from "@/lib/supabase/database.types";
import {
  accountRoleSchema,
  courtCountSchema,
  matchMinutesSchema,
  matchSideSchema,
  playTypeSchema,
  sessionMinutesSchema,
  skillLevelSchema,
  teamCountSchema,
  tournamentFormatSchema,
} from "@/lib/validation/enums";
import { quickPlayTitleSchema } from "@/lib/validation/schemas";

/**
 * The boundary between the `Tournament`-shaped Quick Play session and the row
 * that stores it.
 *
 * Pure on purpose — no React, no Supabase client, only the generated row types.
 * That keeps it testable in the node-environment vitest run and keeps the
 * translation in one place rather than smeared through the sync provider.
 *
 * Reads are validated rather than trusted. The publishable key lets any visitor
 * write to their own row, so a row coming back can contain anything that got
 * past the table's CHECK constraints — and `fromQuickPlayRow` returns `null`
 * instead of throwing, so a hand-edited row degrades to "start fresh" rather
 * than crashing the page.
 */

export type QuickPlaySessionRow =
  Database["public"]["Tables"]["quick_play_sessions"]["Row"];
export type QuickPlaySessionInsert =
  Database["public"]["Tables"]["quick_play_sessions"]["Insert"];

/**
 * Exactly the thirteen columns the client owns. `id`, `created_at` and
 * `updated_at` are never sent: on create Postgres mints the id, on save the id
 * is the `.eq("id", …)` filter rather than payload, and the table's trigger
 * maintains the timestamps so a client cannot lie about when it last wrote.
 */
export function toQuickPlayRow(
  session: Tournament,
  owner: string,
): QuickPlaySessionInsert {
  return {
    owner,
    title: session.name,
    format: session.format,
    team_count: session.teamCount,
    court_count: session.courtCount,
    play_type: session.playType,
    match_minutes: session.matchMinutes,
    session_minutes: session.sessionMinutes,
    teams: session.teams,
    team_players: session.teamPlayers,
    decisions: session.decisions,
    roster: session.roster,
    assigned_player_names: session.assignedPlayerNames,
  };
}

/* Built from the same zod enums the forms use, so the closed sets are still
   declared exactly once. Unknown keys — `owner`, the timestamps — are stripped
   by zod rather than rejected. */
const quickPlayRowSchema = z
  .object({
    title: quickPlayTitleSchema,
    format: tournamentFormatSchema,
    team_count: teamCountSchema,
    court_count: courtCountSchema,
    play_type: playTypeSchema,
    match_minutes: matchMinutesSchema,
    session_minutes: sessionMinutesSchema,
    teams: z.array(z.string()),
    team_players: z.array(z.array(z.string())),
    decisions: z.record(z.string(), matchSideSchema),
    roster: z.array(
      z.object({
        name: z.string(),
        role: accountRoleSchema,
        skill: skillLevelSchema,
      }),
    ),
    assigned_player_names: z.array(z.string()),
  })
  // `TeamAssignment` and `buildBracketVM` both index `teams` and `teamPlayers`
  // by team slot, so a row whose collections disagree with its team count would
  // render undefined slots. A CHECK constraint cannot compare two jsonb lengths
  // against a column cheaply, so the invariant is enforced on the way in here.
  .superRefine((row, ctx) => {
    if (row.teams.length !== row.team_count) {
      ctx.addIssue({
        code: "custom",
        path: ["teams"],
        message: "teams must have one entry per team.",
      });
    }
    if (row.team_players.length !== row.team_count) {
      ctx.addIssue({
        code: "custom",
        path: ["team_players"],
        message: "team_players must have one entry per team.",
      });
    }
  });

/**
 * `null` for anything that is not a session this app can render. The id and the
 * seven inert filler fields come from `createQuickPlaySession()` rather than the
 * database, which is the single source of truth for them; the name is the row's
 * stored `title`.
 */
export function fromQuickPlayRow(row: unknown): Tournament | null {
  const parsed = quickPlayRowSchema.safeParse(row);
  if (!parsed.success) {
    return null;
  }

  const data = parsed.data;

  return {
    ...createQuickPlaySession(data.title),
    format: data.format,
    teamCount: data.team_count,
    courtCount: data.court_count,
    playType: data.play_type,
    matchMinutes: data.match_minutes,
    sessionMinutes: data.session_minutes,
    teams: data.teams,
    teamPlayers: data.team_players,
    decisions: data.decisions,
    roster: data.roster,
    assignedPlayerNames: data.assigned_player_names,
  };
}
