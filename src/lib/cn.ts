/** Joins the truthy parts of a class list. No dependency, no merge semantics. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
