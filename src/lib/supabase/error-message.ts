/**
 * One sentence fragment for anything a Supabase call went wrong with.
 *
 * Not every auth failure is returned rather than thrown — see the same
 * reasoning in `@/lib/supabase/proxy`. This is what the `catch` arms hand to
 * the copy, so a thrown non-Error never reaches the page as "[object Object]".
 */
export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "something went wrong";
}
