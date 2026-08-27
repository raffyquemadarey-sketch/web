/**
 * Who is looking at the page, and the pure decisions made about it.
 *
 * Pure on purpose — no React, no Supabase client, exactly as in
 * `@/lib/quick-play/sync-status`. `ViewerProvider` needs a browser and cannot
 * be reached from the node-environment vitest run, so the rules that decide
 * whether an editing control renders live out here where they can be tested
 * directly.
 */

export type ViewerRole = "admin" | "member";

export type Viewer =
  | { kind: "loading" }
  /** No NEXT_PUBLIC_SUPABASE_* configured — there is no auth to have. */
  | { kind: "unconfigured" }
  | { kind: "signed-out" }
  | { kind: "signed-in"; userId: string; email: string | null; role: ViewerRole }
  | { kind: "error"; message: string };

/**
 * Whether this viewer may be shown the editing controls.
 *
 * Everything that is not a resolved, signed-in admin is false — `loading` and
 * `error` included. The default has to be read-only, so a viewer that has not
 * resolved yet, or that failed to, never renders a control. This is cosmetic
 * either way: the insert/update/delete policies on `quick_play_sessions` are
 * what actually refuse a non-admin, and they do it whether this is right or not.
 */
export function isAdmin(viewer: Viewer): boolean {
  return viewer.kind === "signed-in" && viewer.role === "admin";
}

/** Narrows the generated `profiles.role` column — a plain `string` — without a
 *  cast. Anything that is not exactly `"admin"`, a missing row included, is a
 *  member, so an account the trigger never saw is read-only rather than broken. */
export function toViewerRole(role: string | null | undefined): ViewerRole {
  return role === "admin" ? "admin" : "member";
}

/**
 * What to put on screen when the viewer could not be resolved at all.
 *
 * `isAdmin` is false for `error`, which is the right default for deciding
 * whether a control renders — but every sentence next to that control would
 * then be asserting something the app does not know. A role read that failed
 * must read as "we couldn't check", never as a confident "you are not an
 * admin": the one viewer this happens to most is a real admin on a flaky
 * connection, and telling them they lack access is both wrong and unactionable.
 */
export function describeViewerError(message: string): string {
  return `We couldn't check your account — ${message}. Nothing on this page can be changed or created until we can; reload to try again.`;
}

/**
 * What to put on screen when a sign-in is refused.
 *
 * The codes come from `AuthError.code` (`@supabase/auth-js`
 * `lib/errors.d.ts:24`). The raw message is the fallback rather than a generic
 * sentence, so a code this map has never seen still says something true instead
 * of rendering an empty alert.
 */
export function describeSignInError(
  code: string | undefined,
  message: string,
): string {
  switch (code) {
    case "invalid_credentials":
      return "That email and password don't match an account.";
    case "email_not_confirmed":
      return "That account hasn't confirmed its email address yet. Confirm it from the email, or tick “Auto Confirm User” when creating the account in the Supabase dashboard.";
    case "over_request_rate_limit":
      return "Too many attempts — wait a minute and try again.";
    default:
      return `Not signed in — ${message}.`;
  }
}
