import { z } from "zod";

/* zod is the single source of truth for the closed sets, so the same schemas can
   back Supabase inserts once a backend exists.

   Every message here is a sentence a user can read: an un-messaged schema falls
   back to zod's own wording ("Invalid option: expected one of …"), which leaks
   internal enum values into the form's role="alert". Callers that need different
   wording rebuild the enum from `.options` — see confirmEntrySchema. */

export const accountRoleSchema = z.enum(
  ["player", "coach", "admin"],
  "Choose what you're registering as.",
);
export const skillLevelSchema = z.enum(
  ["beginner", "intermediate", "advanced"],
  "Choose your skill level.",
);
export const tournamentFormatSchema = z.enum(
  ["single", "double", "roundrobin"],
  "Choose a bracket format.",
);
export const playTypeSchema = z.enum(
  ["singles", "doubles"],
  "Choose a play type.",
);
export const matchSideSchema = z.enum(["a", "b"], "Choose a side.");

export const teamCountSchema = z
  .number("Choose a supported team count.")
  .int("Choose a supported team count.")
  .refine((n): n is number => [4, 5, 6, 7, 8, 9, 10, 16].includes(n), {
    message: "Choose a supported team count.",
  });

export const courtCountSchema = z
  .number("Choose a supported court count.")
  .int("Choose a supported court count.")
  .refine((n): n is number => [2, 4, 6, 8].includes(n), {
    message: "Choose a supported court count.",
  });

/* Wall-clock scheduling settings, both in minutes. The option lists live here
   next to their schemas so each set is declared once; TEAM_COUNT_OPTIONS and
   COURT_COUNT_OPTIONS predate this and still sit in `@/lib/data/fixtures`. */

export const MATCH_MINUTES_OPTIONS = [15, 20, 25, 30, 45, 60] as const;
export const SESSION_MINUTES_OPTIONS = [
  60, 90, 120, 180, 240, 300, 360, 480,
] as const;

export const matchMinutesSchema = z
  .number("Choose a supported match length.")
  .int("Choose a supported match length.")
  .refine(
    (n): n is number => (MATCH_MINUTES_OPTIONS as readonly number[]).includes(n),
    { message: "Choose a supported match length." },
  );

export const sessionMinutesSchema = z
  .number("Choose a supported session length.")
  .int("Choose a supported session length.")
  .refine(
    (n): n is number => (SESSION_MINUTES_OPTIONS as readonly number[]).includes(n),
    { message: "Choose a supported session length." },
  );

export type AccountRole = z.infer<typeof accountRoleSchema>;
export type SkillLevel = z.infer<typeof skillLevelSchema>;
export type TournamentFormat = z.infer<typeof tournamentFormatSchema>;
export type PlayType = z.infer<typeof playTypeSchema>;
export type MatchSide = z.infer<typeof matchSideSchema>;
