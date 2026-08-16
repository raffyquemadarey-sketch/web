"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { CalloutPanel } from "@/components/ui/callout-panel";
import { PhotoPlaceholder } from "@/components/ui/avatar";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { FormCard } from "@/components/ui/form-card";
import { Input } from "@/components/ui/input";
import { RadioGroup } from "@/components/ui/radio-group";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useDemoActions } from "@/lib/demo/demo-data-provider";
import { useDemoSession } from "@/lib/demo/demo-session-provider";
import { formatTournamentDates } from "@/lib/tournament/dates";
import type { AccountRole, SkillLevel } from "@/lib/validation/enums";
import { registrationSchema } from "@/lib/validation/schemas";
import type { RegistrationInput } from "@/lib/validation/schemas";

const ROLE_OPTIONS: { value: AccountRole; label: string }[] = [
  { value: "player", label: "Player" },
  { value: "coach", label: "Coach" },
  { value: "admin", label: "Club admin" },
];

const SKILL_OPTIONS: { value: SkillLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export type EntryTournamentSummary = {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
};

export function RegisterForm({
  tournament,
}: {
  tournament?: EntryTournamentSummary;
}) {
  const router = useRouter();
  const { signInDemo, setEntry } = useDemoSession();
  const { addRosterEntry } = useDemoActions();

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    mode: "onBlur",
    defaultValues: {
      role: "player",
      fullName: "",
      email: "",
      phone: "",
      password: "",
      // Deliberately unset: the schema requires players to choose, and a
      // pre-selected radio would make that choice for them.
      skill: undefined,
    },
  });

  const role = useWatch({ control, name: "role" });

  const onSubmit = handleSubmit((values) => {
    const skill = values.role === "player" ? (values.skill ?? null) : null;
    signInDemo(
      {
        name: values.fullName,
        email: values.email,
        role: values.role,
        skill,
      },
      { isNewAccount: true },
    );
    if (tournament) {
      if (values.role === "player" && skill) {
        addRosterEntry(tournament.id, {
          name: values.fullName,
          role: values.role,
          skill,
        });
      }
      // Registering from a tournament link enters straight away: the skill
      // radio is both the profile level and the division for that entry.
      setEntry({ tournamentId: tournament.id, division: skill });
    }
    router.push("/dashboard");
  });

  return (
    <FormCard width={480} onSubmit={onSubmit} noValidate>
      {tournament ? (
        <CalloutPanel
          size="sm"
          style={{ marginBottom: "20px", fontSize: "13.5px" }}
        >
          Entering <strong>{tournament.name}</strong> ·{" "}
          {formatTournamentDates(tournament.startDate, tournament.endDate)}
        </CalloutPanel>
      ) : null}

      <h2 style={{ fontSize: "28px", margin: "0 0 4px" }}>Create your account</h2>
      <p style={{ fontSize: "14px", opacity: 0.7, margin: "0 0 24px" }}>
        Already registered?{" "}
        <Link href="/signin" style={{ textDecoration: "underline" }}>
          Sign in
        </Link>
      </p>

      <div
        style={{ display: "flex", justifyContent: "center", marginBottom: "22px" }}
      >
        <PhotoPlaceholder size={96} />
      </div>

      <Field className="mb-[14px]">
        <Controller
          control={control}
          name="role"
          render={({ field }) => (
            <SegmentedControl
              name="role"
              label="I'm registering as"
              value={field.value}
              options={ROLE_OPTIONS}
              onChange={field.onChange}
            />
          )}
        />
      </Field>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "14px",
          marginBottom: "14px",
        }}
      >
        <Field error={errors.fullName?.message} style={{ gridColumn: "1 / -1" }}>
          <FieldLabel>Full name</FieldLabel>
          <Input type="text" placeholder="Alex Chen" {...register("fullName")} />
          <FieldError />
        </Field>
        <Field error={errors.email?.message} style={{ gridColumn: "1 / -1" }}>
          <FieldLabel>Email</FieldLabel>
          <Input type="email" placeholder="you@example.com" {...register("email")} />
          <FieldError />
        </Field>
        <Field error={errors.phone?.message}>
          <FieldLabel>Phone</FieldLabel>
          <Input type="tel" placeholder="(555) 012-3456" {...register("phone")} />
          <FieldError />
        </Field>
        <Field error={errors.password?.message}>
          <FieldLabel>Password</FieldLabel>
          <Input
            type="password"
            placeholder="At least 8 characters"
            {...register("password")}
          />
          <FieldError />
        </Field>
      </div>

      {role === "player" ? (
        <Field error={errors.skill?.message} className="mb-[18px]">
          <FieldLabel asGroupLabel>Skill level</FieldLabel>
          <Controller
            control={control}
            name="skill"
            render={({ field }) => (
              <RadioGroup
                name="skill"
                value={field.value}
                options={SKILL_OPTIONS}
                onChange={field.onChange}
              />
            )}
          />
          <FieldError />
        </Field>
      ) : null}

      <Button
        type="submit"
        variant="primary"
        block
        style={{ minHeight: "44px", fontSize: "14px" }}
      >
        {tournament ? "Create account & register" : "Create account"}
      </Button>
      <p
        style={{
          fontSize: "12px",
          opacity: 0.55,
          margin: "14px 0 0",
          textAlign: "center",
        }}
      >
        By registering you agree to the rules and code of conduct.
      </p>
    </FormCard>
  );
}
