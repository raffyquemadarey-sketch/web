"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { describeViewerError, isAdmin } from "@/lib/auth/viewer";
import type { Viewer } from "@/lib/auth/viewer";
import { useDemoActions } from "@/lib/demo/demo-data-provider";
import { useQuickPlaySync } from "@/lib/quick-play/sync-provider";
import type { QuickPlaySyncStatus } from "@/lib/quick-play/sync-status";

/** How long the wipe stays armed before it forgets it was asked. */
const CONFIRM_MS = 5000;

/**
 * The line above the whiteboard, in both of its versions.
 *
 * `QuickPlaySaveStatus` is what the creating admin sees: what the sheet is doing
 * about saving itself, plus the only way to empty it. The wipe is a two-step
 * confirm rather than `window.confirm`, which is modal, unstyled and blocks the
 * whole tab. It empties this quick play but keeps its title and its row —
 * deleting a quick play is done from the list. Emptying it is an edit like any
 * other, so the empty sheet saves itself the same way.
 *
 * `QuickPlayViewerNote` takes the same slot for everyone else, who has nothing
 * to save and no sheet to wipe.
 */
function statusText(status: QuickPlaySyncStatus): string | null {
  switch (status.kind) {
    // Nothing of this quick play is on screen yet, this line included: the
    // session UI renders a header on its own until the read resolves — see
    // `isOpening` — so there is no whiteboard for a status to be about.
    case "starting":
    case "loading":
    case "reloading":
      return null;
    // The session UI renders its own panel for each of these and never mounts
    // the status line either, so there is nothing left to say here. `off` and
    // `missing` both mean there is no quick play at this address to report on;
    // `load-failed` deliberately has no sentence of its own, because a status
    // line under a whiteboard is the wrong place to admit the whiteboard is not
    // the saved sheet.
    case "off":
    case "missing":
    case "load-failed":
      return null;
    // The opposite of `missing`: the quick play is still there, this account
    // may just no longer change it. The sheet on screen is left exactly as the
    // user has it — throwing their unsaved work away over a permission change
    // would be the worst possible answer.
    case "refused":
      return "Not saved — this account can no longer change this quick play, so nothing further will be saved. That happens if your admin access was removed, or if this quick play belongs to another admin. Your changes are still here in this tab; reload to see the saved version, and ask a club admin if you think this is wrong.";
    case "saving":
      return "Saving…";
    // Also what a finished load leaves behind, and true of both: the sheet on
    // screen is the sheet in the row.
    case "saved":
      return "Saved.";
    case "error":
      return `Not saved — ${status.message}. This quick play still works in this tab, and it will try again on your next change.`;
  }
}

export function QuickPlaySaveStatus() {
  const { status } = useQuickPlaySync();
  const actions = useDemoActions();
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <div
      style={{
        display: "flex",
        // Wraps rather than scrolls: the longest message is several lines at
        // 375px, and a horizontal scrollbar on a whiteboard is unusable.
        flexWrap: "wrap",
        alignItems: "center",
        gap: "12px",
        margin: "0 0 20px",
      }}
    >
      <p
        role="status"
        aria-live="polite"
        style={{
          fontSize: "13px",
          opacity: 0.65,
          margin: 0,
          maxWidth: "60ch",
        }}
      >
        {statusText(status)}
      </p>
      <Button
        variant="ghost"
        onClick={() => {
          if (!armed) {
            setArmed(true);
            return;
          }
          setArmed(false);
          actions.resetQuickPlay();
        }}
      >
        {armed ? "Wipe everything — press again" : "Start a clean sheet"}
      </Button>
    </div>
  );
}

/** The same slot, for a viewer who cannot change anything. The Sign in link is
 *  only offered to someone signed out — a signed-in member signing in again
 *  would change nothing.
 *
 *  The `error` viewer gets its own sentence rather than the read-only one: the
 *  controls are gone either way, but "only an admin can change this" would be
 *  claiming to know something the app failed to find out.
 *
 *  The middle branch relies on where this is mounted, and on nothing else being
 *  true there. The session page renders it only when `canEdit` is false and only
 *  once the row has been read — it shows a header and nothing else while
 *  `isOpening` holds — so `createdBy` is a real account id by the time this
 *  renders, and an `isAdmin` viewer reaching it is precisely an admin who did
 *  not create this quick play. Both halves are load-bearing: without the second,
 *  the admin who *did* create it would read this sentence for the length of the
 *  read, on every navigation into their own session. */
export function QuickPlayViewerNote({ viewer }: { viewer: Viewer }) {
  return (
    <p
      role="status"
      style={{
        fontSize: "13px",
        opacity: 0.65,
        margin: "0 0 20px",
        maxWidth: "60ch",
      }}
    >
      {viewer.kind === "error" ? (
        describeViewerError(viewer.message)
      ) : isAdmin(viewer) ? (
        "You're a club admin, but another admin created this quick play — only they can add players, change settings or record results. You can follow the teams and the bracket here, and start your own from Quick Play."
      ) : (
        <>
          You&apos;re viewing this quick play. Only the club admin who created it
          can add players, change settings or record results.
          {viewer.kind === "signed-out" ? (
            <>
              {" "}
              <Link href="/signin" style={{ textDecoration: "underline" }}>
                Sign in
              </Link>
            </>
          ) : null}
        </>
      )}
    </p>
  );
}
