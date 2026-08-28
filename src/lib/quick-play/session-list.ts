import { z } from "zod";

import type { TournamentFormat } from "@/lib/validation/enums";
import { teamCountSchema, tournamentFormatSchema } from "@/lib/validation/enums";
import { quickPlayTitleSchema } from "@/lib/validation/schemas";

/**
 * The boundary between a saved quick play and the card that lists it.
 *
 * Pure on purpose — no React, no Supabase client, exactly as in `session-row`,
 * and reads are validated rather than trusted for the same reason: any admin
 * can write any row, so a row coming back can hold anything the table's CHECK
 * constraints allowed. `toQuickPlaySummary`
 * returns `null` instead of throwing, so one unreadable row is dropped from the
 * list rather than taking the whole list down.
 */

export type QuickPlaySummary = {
  id: string;
  title: string;
  format: TournamentFormat;
  teamCount: number;
  playerCount: number;
  /** The row's `updated_at`, verbatim. Formatted for display by the list. */
  updatedAt: string;
  /** The row's creator, the only account that may delete it; `null` only for a
   *  row that predates the creator-ownership migration, which the card renders
   *  read-only rather than hiding. */
  createdBy: string | null;
};

/** Exactly the columns the list card renders, plus one it does not — the roster
 *  is fetched only to count it, and `created_by` only to decide whether Delete
 *  renders, so nothing else about a saved sheet crosses the wire for a list. */
export const QUICK_PLAY_LIST_COLUMNS =
  "id, title, format, team_count, roster, updated_at, created_by";

const quickPlaySummarySchema = z.object({
  id: z.uuid(),
  title: quickPlayTitleSchema,
  format: tournamentFormatSchema,
  team_count: teamCountSchema,
  // Only its length is used, so the entries themselves are never inspected.
  roster: z.array(z.unknown()),
  updated_at: z.string(),
  created_by: z.uuid().nullable(),
});

/** `null` for anything the list cannot render — `formatLabel` takes a narrowed
 *  `TournamentFormat`, so an unknown format has to be caught here. */
export function toQuickPlaySummary(row: unknown): QuickPlaySummary | null {
  const parsed = quickPlaySummarySchema.safeParse(row);
  if (!parsed.success) {
    return null;
  }

  const data = parsed.data;

  return {
    id: data.id,
    title: data.title,
    format: data.format,
    teamCount: data.team_count,
    playerCount: data.roster.length,
    updatedAt: data.updated_at,
    createdBy: data.created_by,
  };
}
