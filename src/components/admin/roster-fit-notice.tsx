"use client";

import { Button } from "@/components/ui/button";
import { CalloutPanel } from "@/components/ui/callout-panel";
import { Tag } from "@/components/ui/tag";
import {
  describeRosterFit,
  describeSuggestion,
  getRosterFit,
} from "@/lib/tournament/sizing";
import type { PlayType } from "@/lib/validation/enums";

/**
 * Advisory only: it never resizes the draw, never disables a control and never
 * blocks a save. A mismatch between the roster and the team count is a
 * configuration the admin is entitled to keep, which is also why the status text
 * is `role="status"` (polite) rather than `role="alert"` (assertive).
 */
export function RosterFitNotice({
  playerCount,
  playType,
  teamCount,
  rosterVerb,
  onUseSuggestion,
}: {
  playerCount: number;
  playType: PlayType;
  teamCount: number;
  /** "been added" for a hand-typed roster; omitted, it reads "registered". */
  rosterVerb?: "registered" | "been added";
  onUseSuggestion: (teamCount: number) => void;
}) {
  const fit = getRosterFit({ playerCount, playType, teamCount });
  const warning = fit.status === "overfilled" || fit.status === "underfilled";
  const suggestion = describeSuggestion(fit.suggestion);
  // Suggesting a size for an empty roster, or the size already chosen, is noise.
  const offerSuggestion = suggestion !== null && fit.suggestion.suggested !== teamCount;

  return (
    <CalloutPanel
      size="sm"
      style={{
        marginBottom: "18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        flexWrap: "wrap",
        ...(warning ? { background: "var(--color-accent-100)" } : {}),
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <Tag tone={warning ? "accent" : "accent-2"}>Team size</Tag>
        {/* One live region, rendered in every state: a status element that
            mounts alongside its message is frequently never announced. */}
        <p role="status" style={{ fontSize: "13.5px", margin: 0 }}>
          {describeRosterFit(fit, rosterVerb)}
          {offerSuggestion ? ` ${suggestion}` : ""}
        </p>
      </div>
      {offerSuggestion ? (
        <Button
          variant="secondary"
          onClick={() => onUseSuggestion(fit.suggestion.suggested)}
        >
          Use {fit.suggestion.suggested} teams
        </Button>
      ) : null}
    </CalloutPanel>
  );
}
