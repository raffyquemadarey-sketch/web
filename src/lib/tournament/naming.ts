/* The tournament name the create form offers before the admin writes their own.
   A title, so it joins with the em dash `layout.tsx` uses for titles rather than
   the `·` the meta rows use — the name renders directly above a `dates · location`
   row, and repeating that separator with the operands reversed reads badly.

   Partial input yields a partial name on purpose: half a suggestion beats a blank
   required field, and it converges as the second field is filled. */

/** Mirrors `tournamentDraftSchema.name`'s max. Keep the two in step. */
const MAX_NAME_LENGTH = 80;

export type TournamentNameParts = { location: string; dates: string };

export function suggestTournamentName({ location, dates }: TournamentNameParts): string {
  const place = location.trim();
  const when = dates.trim();

  // Preference order: both fields, then whichever one is filled.
  const candidates = [place && when ? `${place} — ${when}` : "", place, when];

  return candidates.find((c) => c.length > 0 && c.length <= MAX_NAME_LENGTH) ?? "";
}
