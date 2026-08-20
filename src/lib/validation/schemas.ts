import { z } from "zod";

import { isoDateSchema, optionalIsoDateSchema } from "./dates";
import {
  accountRoleSchema,
  courtCountSchema,
  matchMinutesSchema,
  playTypeSchema,
  sessionMinutesSchema,
  skillLevelSchema,
  teamCountSchema,
  tournamentFormatSchema,
} from "./enums";

const PHONE_PATTERN = /^[0-9+()\-\s.]+$/;

/* Every message below is user-facing: it renders verbatim in the field's
   role="alert". The first argument to z.string()/z.enum() covers the wrong-type
   case (missing or non-string input), which otherwise falls back to zod's own
   "Invalid input: expected …" wording. */

export const registrationSchema = z
  .object({
    role: accountRoleSchema,
    fullName: z
      .string("Enter your full name.")
      .trim()
      .min(2, "Enter your full name.")
      .max(80, "Keep this under 80 characters."),
    email: z.email("Enter a valid email address."),
    phone: z
      .string("Enter a contact number.")
      .trim()
      .min(7, "Enter a contact number.")
      .max(25, "Keep this under 25 characters.")
      .regex(PHONE_PATTERN, "Use digits, spaces and + ( ) - . only."),
    password: z.string("Use at least 8 characters.").min(8, "Use at least 8 characters."),
    skill: skillLevelSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.role === "player" && !value.skill) {
      ctx.addIssue({
        code: "custom",
        path: ["skill"],
        message: "Choose your skill level.",
      });
    }
  });

export const signInSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string("Enter your password.").min(1, "Enter your password."),
});

/* The entry form calls this field a division, so it cannot reuse the shared
   enum's "skill level" wording — rebuild it from the same options instead. */
export const confirmEntrySchema = z.object({
  skill: z.enum(skillLevelSchema.options, "Choose your division."),
});

export const tournamentDraftSchema = z
  .object({
    name: z
      .string("Enter a tournament name.")
      .trim()
      .min(2, "Enter a tournament name.")
      .max(80, "Keep this under 80 characters."),
    startDate: isoDateSchema("Choose a start date."),
    endDate: optionalIsoDateSchema("Choose an end date, or leave it blank."),
    location: z
      .string("Enter a location.")
      .trim()
      .min(2, "Enter a location.")
      .max(80, "Keep this under 80 characters."),
    level: z
      .string("Enter a level.")
      .trim()
      .min(2, "Enter a level.")
      .max(40, "Keep this under 40 characters."),
    description: z
      .string("Enter a short description, or leave it blank.")
      .trim()
      .max(300, "Keep the description under 300 characters.")
      .optional(),
    format: tournamentFormatSchema,
    teamCount: teamCountSchema,
    courtCount: courtCountSchema,
    playType: playTypeSchema,
    matchMinutes: matchMinutesSchema,
    sessionMinutes: sessionMinutesSchema,
  })
  .superRefine((value, ctx) => {
    if (!value.startDate || !value.endDate) return;
    // Zero-padded ISO dates sort chronologically as plain strings, so ordering
    // needs no `Date` — which would read them as UTC midnight anyway.
    if (value.endDate < value.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "The end date cannot be before the start date.",
      });
    }
  });

export const teamNameSchema = z
  .string("Team names cannot be empty.")
  .trim()
  .min(1, "Team names cannot be empty.")
  .max(40, "Keep team names under 40 characters.");

/* Quick Play types players in by hand, so this is the whole entry form. The
   roster is not visible from here, which is why duplicates are caught by the
   form itself rather than by a refinement. */
export const addPlayerSchema = z.object({
  name: z
    .string("Enter a player name.")
    .trim()
    .min(2, "Enter a player name.")
    .max(40, "Keep names under 40 characters."),
});

/* The one thing the create form asks for. Every other Quick Play setting is
   editable on the session page, so asking for it twice would only be slower. */
export const quickPlayTitleSchema = z
  .string("Give this quick play a title.")
  .trim()
  .min(2, "Give this quick play a title.")
  .max(60, "Keep the title under 60 characters.");

export const quickPlayDraftSchema = z.object({ title: quickPlayTitleSchema });

export type RegistrationInput = z.infer<typeof registrationSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ConfirmEntryInput = z.infer<typeof confirmEntrySchema>;
export type TournamentDraftInput = z.infer<typeof tournamentDraftSchema>;
export type TeamNameInput = z.infer<typeof teamNameSchema>;
export type AddPlayerInput = z.infer<typeof addPlayerSchema>;
export type QuickPlayDraftInput = z.infer<typeof quickPlayDraftSchema>;
