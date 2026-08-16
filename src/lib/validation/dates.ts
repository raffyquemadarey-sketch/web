import { z } from "zod";

import { isValidIsoDate } from "@/lib/tournament/dates";

/* Field schemas for the `YYYY-MM-DD` value a native date input submits. Messages
   are supplied by the caller because the same shape backs both "start" and "end"
   wording, and every message here renders verbatim in the field's role="alert". */

/** A required calendar date. */
export function isoDateSchema(requiredMessage: string) {
  return z.string(requiredMessage).refine(isValidIsoDate, requiredMessage);
}

/** An optional calendar date. The empty string is what a cleared date input
 *  submits, so it has to pass. */
export function optionalIsoDateSchema(invalidMessage: string) {
  return z
    .string(invalidMessage)
    .refine((value) => value === "" || isValidIsoDate(value), invalidMessage);
}
