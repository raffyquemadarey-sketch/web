"use client";

import { Field, FieldLabel } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import { COURT_COUNT_OPTIONS, TEAM_COUNT_OPTIONS } from "@/lib/data/fixtures";
import { formatDuration } from "@/lib/tournament/schedule";
import {
  MATCH_MINUTES_OPTIONS,
  SESSION_MINUTES_OPTIONS,
} from "@/lib/validation/enums";
import type { PlayType, TournamentFormat } from "@/lib/validation/enums";

import styles from "./tournament-settings.module.css";

export const FORMAT_OPTIONS: { value: TournamentFormat; label: string }[] = [
  { value: "single", label: "Single elim" },
  { value: "double", label: "Double elim" },
  { value: "roundrobin", label: "Round robin" },
];

export const PLAY_TYPE_OPTIONS: { value: PlayType; label: string }[] = [
  { value: "singles", label: "Singles" },
  { value: "doubles", label: "Doubles" },
];

export const COURT_OPTIONS = COURT_COUNT_OPTIONS.map((n) => ({
  value: String(n),
  label: String(n),
}));

export const TEAM_OPTIONS = TEAM_COUNT_OPTIONS.map((n) => ({
  value: String(n),
  label: String(n),
}));

export const MATCH_MINUTES_SELECT_OPTIONS = MATCH_MINUTES_OPTIONS.map((n) => ({
  value: String(n),
  label: `${n} min`,
}));

export const SESSION_MINUTES_SELECT_OPTIONS = SESSION_MINUTES_OPTIONS.map((n) => ({
  value: String(n),
  label: formatDuration(n),
}));

export function TournamentSettings({
  idPrefix,
  format,
  teamCount,
  courtCount,
  playType,
  matchMinutes,
  sessionMinutes,
  onFormatChange,
  onTeamCountChange,
  onCourtCountChange,
  onPlayTypeChange,
  onMatchMinutesChange,
  onSessionMinutesChange,
  disabled = false,
}: {
  idPrefix: string;
  format: TournamentFormat;
  teamCount: number;
  courtCount: number;
  playType: PlayType;
  matchMinutes: number;
  sessionMinutes: number;
  onFormatChange: (format: TournamentFormat) => void;
  onTeamCountChange: (teamCount: number) => void;
  onCourtCountChange: (courtCount: number) => void;
  onPlayTypeChange: (playType: PlayType) => void;
  onMatchMinutesChange: (matchMinutes: number) => void;
  onSessionMinutesChange: (sessionMinutes: number) => void;
  /** Read-only: shown and dimmed rather than hidden, because "6 teams, doubles,
   *  20-minute matches" is the session's shape and a viewer came for it. */
  disabled?: boolean;
}) {
  return (
    <>
      <div className={styles.grid}>
        <Field>
          <SegmentedControl
            name={`${idPrefix}-format`}
            label="Bracket format"
            value={format}
            options={FORMAT_OPTIONS}
            onChange={onFormatChange}
            disabled={disabled}
          />
        </Field>
        <Field>
          <FieldLabel>Number of teams</FieldLabel>
          <Select
            options={TEAM_OPTIONS}
            value={String(teamCount)}
            onChange={(event) => onTeamCountChange(Number(event.target.value))}
            disabled={disabled}
          />
        </Field>
        <Field>
          <SegmentedControl
            name={`${idPrefix}-courts`}
            label="Number of courts"
            value={String(courtCount)}
            options={COURT_OPTIONS}
            onChange={(value) => onCourtCountChange(Number(value))}
            disabled={disabled}
          />
        </Field>
        <Field>
          <SegmentedControl
            name={`${idPrefix}-playtype`}
            label="Play type"
            value={playType}
            options={PLAY_TYPE_OPTIONS}
            onChange={onPlayTypeChange}
            disabled={disabled}
          />
        </Field>
        <Field>
          <FieldLabel>Match length</FieldLabel>
          <Select
            options={MATCH_MINUTES_SELECT_OPTIONS}
            value={String(matchMinutes)}
            onChange={(event) => onMatchMinutesChange(Number(event.target.value))}
            disabled={disabled}
          />
        </Field>
        <Field>
          <FieldLabel>Session length</FieldLabel>
          <Select
            options={SESSION_MINUTES_SELECT_OPTIONS}
            value={String(sessionMinutes)}
            onChange={(event) => onSessionMinutesChange(Number(event.target.value))}
            disabled={disabled}
          />
        </Field>
      </div>
      {/* An instruction to somebody who can change them, so it goes with them. */}
      {disabled ? null : (
        <p style={{ fontSize: "12.5px", opacity: 0.55, margin: "-16px 0 26px" }}>
          Changing format, team count or play type resets results.
        </p>
      )}
    </>
  );
}
