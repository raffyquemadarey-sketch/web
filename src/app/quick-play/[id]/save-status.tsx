"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useDemoActions } from "@/lib/demo/demo-data-provider";
import { useQuickPlaySync } from "@/lib/quick-play/sync-provider";
import type { QuickPlaySyncStatus } from "@/lib/quick-play/sync-status";

/** How long the wipe stays armed before it forgets it was asked. */
const CONFIRM_MS = 5000;

/**
 * What the sheet is doing about saving itself, plus the only way to empty it.
 *
 * The wipe is a two-step confirm rather than `window.confirm`, which is modal,
 * unstyled and blocks the whole tab. It empties this quick play but keeps its
 * title and its row — deleting a quick play is done from the list. It doubles
 * as the resolution for `conflict`: wiping settles which sheet wins, so saving
 * can start again.
 */
function statusText(status: QuickPlaySyncStatus): string | null {
  switch (status.kind) {
    // Before the first effect runs there is nothing true to say, and saying
    // nothing is what keeps server and client HTML identical.
    case "starting":
      return null;
    case "off":
      return "Saving is off — this Supabase project isn't configured.";
    // The session UI renders its own panel for this and never mounts the
    // status line, so there is nothing left to say here.
    case "missing":
      return null;
    case "loading":
      return "Opening this quick play…";
    case "idle":
      return "This quick play will save itself as soon as you change something.";
    case "saving":
      return "Saving…";
    case "saved":
      return "Saved.";
    // Three things, because leaving any of them out strands the user: the
    // saved sheet survived, this tab is not saving, and here are both exits.
    case "conflict":
      return "This quick play finished loading after you'd already started changing it, so what was saved was left alone — and nothing in this tab is being saved right now. Reload to pick up the saved version, or use Start a clean sheet to clear this one and save from here.";
    case "error":
      return `Not saved — ${status.message}. This quick play still works in this tab, and it will try again on your next change.`;
  }
}

export function QuickPlaySaveStatus() {
  const { status, resolveConflict } = useQuickPlaySync();
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
          // Second half of the wipe: emptying the sheet is only half an exit
          // from `conflict` — without this the status stays there, saving
          // stays off and the button does nothing you can see. A no-op in
          // every other status, so it is unconditional here.
          resolveConflict();
        }}
      >
        {armed ? "Wipe everything — press again" : "Start a clean sheet"}
      </Button>
    </div>
  );
}
