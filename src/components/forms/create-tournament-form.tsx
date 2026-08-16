"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { ScheduleEstimateNotice } from "@/components/admin/schedule-estimate-notice";
import {
  COURT_OPTIONS,
  FORMAT_OPTIONS,
  MATCH_MINUTES_SELECT_OPTIONS,
  PLAY_TYPE_OPTIONS,
  SESSION_MINUTES_SELECT_OPTIONS,
  TEAM_OPTIONS,
} from "@/components/admin/tournament-settings";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldHint, FieldLabel } from "@/components/ui/field";
import { FormCard } from "@/components/ui/form-card";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { newDemoTournamentId } from "@/lib/data/repository";
import { useDemoActions } from "@/lib/demo/demo-data-provider";
import { formatTournamentDates } from "@/lib/tournament/dates";
import { googleMapsSearchUrl } from "@/lib/tournament/maps";
import { suggestTournamentName } from "@/lib/tournament/naming";
import { makeEmptyTeamPlayers, makeTeams } from "@/lib/tournament/teams";
import { tournamentDraftSchema } from "@/lib/validation/schemas";
import type { TournamentDraftInput } from "@/lib/validation/schemas";

export function CreateTournamentForm() {
  const router = useRouter();
  const { createTournament } = useDemoActions();

  const {
    control,
    register,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<TournamentDraftInput>({
    resolver: zodResolver(tournamentDraftSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      startDate: "",
      endDate: "",
      location: "",
      level: "",
      description: "",
      format: "single",
      teamCount: 8,
      courtCount: 4,
      playType: "singles",
      matchMinutes: 30,
      sessionMinutes: 240,
    },
  });

  /* The live schedule estimate needs the draft's current scheduling settings, and
     the auto-filled name needs the location and dates.
     `useForm().watch()` would do it, but the React Compiler cannot memoize a
     function-returning API and skips the whole component in response; `useWatch`
     subscribes to just these eight fields and keeps the component compiled. */
  const [
    format,
    teamCount,
    courtCount,
    matchMinutes,
    sessionMinutes,
    location,
    startDate,
    endDate,
  ] = useWatch({
    control,
    name: [
      "format",
      "teamCount",
      "courtCount",
      "matchMinutes",
      "sessionMinutes",
      "location",
      "startDate",
      "endDate",
    ],
  });

  /* The name writes itself from location + dates until the admin types their own.
     A local flag, not `dirtyFields.name`: `setValue` only touches dirty state when
     asked to, but RHF recomputes the whole form's dirty set whenever any field
     returns to its default, which would spuriously mark an auto-filled name dirty
     and kill auto-fill for good. Only a real keystroke in the name field counts. */
  const [nameOverridden, setNameOverridden] = useState(false);
  const dates = formatTournamentDates(startDate, endDate ? endDate : null);
  const suggestedName = suggestTournamentName({ location, dates });
  const locationMapUrl = googleMapsSearchUrl(location ?? "");

  useEffect(() => {
    if (nameOverridden) return;
    /* No `shouldDirty`/`shouldTouch` — marking the field edited is the one thing
       this must not do. `shouldValidate` is gated on a suggestion long enough to
       pass the schema, so validating can only clear a stale "Enter a tournament
       name." and never flash a new error while `mode: "onBlur"` is in force.
       Writing `name` cannot change `suggestedName`, so this cannot loop. */
    setValue("name", suggestedName, { shouldValidate: suggestedName.length >= 2 });
  }, [nameOverridden, suggestedName, setValue]);

  const onSubmit = handleSubmit((values) => {
    const id = newDemoTournamentId();
    createTournament({
      id,
      name: values.name,
      startDate: values.startDate,
      endDate: values.endDate ? values.endDate : null,
      location: values.location,
      level: values.level,
      divisions: "Singles, doubles, mixed",
      description: values.description ?? "",
      format: values.format,
      teamCount: values.teamCount,
      courtCount: values.courtCount,
      playType: values.playType,
      matchMinutes: values.matchMinutes,
      sessionMinutes: values.sessionMinutes,
      teams: makeTeams(values.teamCount),
      teamPlayers: makeEmptyTeamPlayers(values.teamCount),
      decisions: {},
      roster: [],
      assignedPlayerNames: [],
    });
    router.push(`/admin/${id}`);
  });

  return (
    <FormCard width={560} onSubmit={onSubmit} noValidate>
      <Link
        href="/admin"
        style={{
          fontSize: "13px",
          textDecoration: "underline",
          display: "inline-block",
          marginBottom: "16px",
        }}
      >
        ← Admin
      </Link>
      <h2 style={{ fontSize: "26px", margin: "0 0 20px" }}>Create tournament</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "14px",
          marginBottom: "14px",
        }}
      >
        <Field
          error={errors.name?.message}
          hint={
            nameOverridden
              ? undefined
              : "Auto-filled from location and dates — edit to use your own."
          }
          style={{ gridColumn: "1 / -1" }}
        >
          <FieldLabel>Tournament name</FieldLabel>
          <Input
            type="text"
            placeholder="Spring Smash"
            {...register("name", {
              /* Fires on genuine typing only: `setValue` assigns `input.value`
                 directly and dispatches no event. Clearing the field back to
                 empty re-arms auto-fill. */
              onChange: (event: ChangeEvent<HTMLInputElement>) => {
                setNameOverridden(event.target.value.trim().length > 0);
              },
            })}
          />
          <FieldError />
          <FieldHint />
        </Field>
        {/* Their own grid: two native date controls squeezed into the outer
            140px tracks would render below their intrinsic width. */}
        <div
          style={{
            gridColumn: "1 / -1",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "14px",
          }}
        >
          <Field error={errors.startDate?.message}>
            <FieldLabel>Start date</FieldLabel>
            <Input type="date" {...register("startDate")} />
            <FieldError />
          </Field>
          <Field
            error={errors.endDate?.message}
            hint="Leave blank for a one-day event."
          >
            <FieldLabel>End date</FieldLabel>
            {/* `min` is a courtesy to the native picker; the schema's superRefine
                is what actually rejects an end date before the start. */}
            <Input type="date" min={startDate || undefined} {...register("endDate")} />
            <FieldError />
            <FieldHint />
          </Field>
        </div>
        <Field error={errors.location?.message} style={{ gridColumn: "1 / -1" }}>
          <FieldLabel>Location</FieldLabel>
          <Input
            type="text"
            placeholder="Riverside Sports Centre"
            {...register("location")}
          />
          <FieldError />
          {locationMapUrl ? (
            <a
              href={locationMapUrl}
              target="_blank"
              rel="noreferrer noopener"
              style={{
                display: "inline-block",
                fontSize: "12px",
                opacity: 0.7,
                marginTop: "5px",
                textDecoration: "underline",
              }}
            >
              View on Google Maps →
            </a>
          ) : null}
        </Field>
        <Field error={errors.level?.message} style={{ gridColumn: "1 / -1" }}>
          <FieldLabel>Level</FieldLabel>
          <Input type="text" placeholder="All levels" {...register("level")} />
          <FieldError />
        </Field>
        <Field error={errors.description?.message} style={{ gridColumn: "1 / -1" }}>
          <FieldLabel>Description</FieldLabel>
          <Textarea
            rows={3}
            placeholder="A short line about the event"
            {...register("description")}
          />
          <FieldError />
        </Field>
      </div>

      <Field error={errors.format?.message} className="mb-[14px]">
        <Controller
          control={control}
          name="format"
          render={({ field }) => (
            <SegmentedControl
              name="draft-format"
              label="Bracket format"
              value={field.value}
              options={FORMAT_OPTIONS}
              onChange={field.onChange}
            />
          )}
        />
        <FieldError />
      </Field>

      <Field error={errors.teamCount?.message} className="mb-[22px]">
        <FieldLabel>Number of teams</FieldLabel>
        <Controller
          control={control}
          name="teamCount"
          render={({ field }) => (
            <Select
              options={TEAM_OPTIONS}
              value={String(field.value)}
              onChange={(event) => field.onChange(Number(event.target.value))}
              onBlur={field.onBlur}
            />
          )}
        />
        <FieldError />
      </Field>

      <Field error={errors.courtCount?.message} className="mb-[22px]">
        <Controller
          control={control}
          name="courtCount"
          render={({ field }) => (
            <SegmentedControl
              name="draft-courts"
              label="Number of courts"
              value={String(field.value)}
              options={COURT_OPTIONS}
              onChange={(value) => field.onChange(Number(value))}
            />
          )}
        />
        <FieldError />
      </Field>

      <Field error={errors.playType?.message} className="mb-[22px]">
        <Controller
          control={control}
          name="playType"
          render={({ field }) => (
            <SegmentedControl
              name="draft-playtype"
              label="Play type"
              value={field.value}
              options={PLAY_TYPE_OPTIONS}
              onChange={field.onChange}
            />
          )}
        />
        <FieldError />
      </Field>

      <Field error={errors.matchMinutes?.message} className="mb-[22px]">
        <FieldLabel>Match length</FieldLabel>
        <Controller
          control={control}
          name="matchMinutes"
          render={({ field }) => (
            <Select
              options={MATCH_MINUTES_SELECT_OPTIONS}
              value={String(field.value)}
              onChange={(event) => field.onChange(Number(event.target.value))}
              onBlur={field.onBlur}
            />
          )}
        />
        <FieldError />
      </Field>

      <Field error={errors.sessionMinutes?.message} className="mb-[22px]">
        <FieldLabel>Session length</FieldLabel>
        <Controller
          control={control}
          name="sessionMinutes"
          render={({ field }) => (
            <Select
              options={SESSION_MINUTES_SELECT_OPTIONS}
              value={String(field.value)}
              onChange={(event) => field.onChange(Number(event.target.value))}
              onBlur={field.onBlur}
            />
          )}
        />
        <FieldError />
      </Field>

      <ScheduleEstimateNotice
        format={format}
        teamCount={teamCount}
        courtCount={courtCount}
        matchMinutes={matchMinutes}
        sessionMinutes={sessionMinutes}
      />

      <Button
        type="submit"
        variant="primary"
        block
        style={{ minHeight: "44px", fontSize: "14px" }}
      >
        Create tournament
      </Button>
    </FormCard>
  );
}
