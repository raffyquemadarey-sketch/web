"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { RadioGroup } from "@/components/ui/radio-group";
import { useDemoActions } from "@/lib/demo/demo-data-provider";
import { useDemoSession } from "@/lib/demo/demo-session-provider";
import type { SkillLevel } from "@/lib/validation/enums";
import { confirmEntrySchema } from "@/lib/validation/schemas";
import type { ConfirmEntryInput } from "@/lib/validation/schemas";

const DIVISION_OPTIONS: { value: SkillLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export function ConfirmEntryForm({
  tournamentId,
  playerName,
}: {
  tournamentId: string;
  playerName: string;
}) {
  const router = useRouter();
  const { setEntry } = useDemoSession();
  const { addRosterEntry } = useDemoActions();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ConfirmEntryInput>({
    resolver: zodResolver(confirmEntrySchema),
    mode: "onBlur",
    defaultValues: { skill: undefined },
  });

  const onSubmit = handleSubmit((values) => {
    addRosterEntry(tournamentId, {
      name: playerName,
      role: "player",
      skill: values.skill,
    });
    setEntry({ tournamentId, division: values.skill });
    router.push("/dashboard");
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <h2 style={{ fontSize: "26px", margin: "0 0 4px" }}>Confirm your entry</h2>
      <p style={{ fontSize: "14px", opacity: 0.7, margin: "0 0 22px" }}>
        Choose your division to finish.
      </p>

      <Field error={errors.skill?.message} className="mb-[20px]">
        <FieldLabel asGroupLabel>Division</FieldLabel>
        <Controller
          control={control}
          name="skill"
          render={({ field }) => (
            <RadioGroup
              name="entry-skill"
              value={field.value}
              options={DIVISION_OPTIONS}
              onChange={field.onChange}
            />
          )}
        />
        <FieldError />
      </Field>

      <Button
        type="submit"
        variant="primary"
        block
        style={{ minHeight: "44px", fontSize: "14px" }}
      >
        Confirm entry
      </Button>
    </form>
  );
}
