"use client";

import { CalloutPanel } from "@/components/ui/callout-panel";
import { Tag } from "@/components/ui/tag";
import { describeSchedule, estimateSchedule } from "@/lib/tournament/schedule";
import type { ScheduleInput } from "@/lib/tournament/schedule";

/**
 * Advisory only, on the same terms as `RosterFitNotice`: an event that overruns
 * its session is still a valid event, so nothing here blocks or disables.
 */
export function ScheduleEstimateNotice({
  format,
  teamCount,
  courtCount,
  matchMinutes,
  sessionMinutes,
}: ScheduleInput) {
  const estimate = estimateSchedule({
    format,
    teamCount,
    courtCount,
    matchMinutes,
    sessionMinutes,
  });
  const { summary, verdict } = describeSchedule(estimate);

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
        ...(estimate.fitsInSession
          ? {}
          : { background: "var(--color-accent-100)" }),
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <Tag tone={estimate.fitsInSession ? "accent-2" : "accent"}>Schedule</Tag>
        {/* The wrapper stays mounted in every state; only the text inside it
            changes, which is what a polite live region needs to announce. */}
        <div role="status">
          <p style={{ fontSize: "13.5px", margin: 0 }}>{summary}</p>
          {verdict ? (
            <p style={{ fontSize: "12.5px", opacity: 0.75, margin: "4px 0 0" }}>
              {verdict}
            </p>
          ) : null}
        </div>
      </div>
    </CalloutPanel>
  );
}
