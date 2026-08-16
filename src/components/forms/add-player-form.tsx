"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { clearFieldAndRefocus } from "@/lib/forms/clear-field";
import { isDuplicatePlayerName, normalisePlayerName } from "@/lib/tournament/roster";
import { addPlayerSchema } from "@/lib/validation/schemas";
import type { AddPlayerInput } from "@/lib/validation/schemas";

/**
 * One name at a time, for a roster nobody registered for. The field clears and
 * refocuses on submit so a whole session can be typed in with Enter between
 * each name.
 */
export function AddPlayerForm({
  existingNames,
  onAdd,
}: {
  existingNames: readonly string[];
  onAdd: (name: string) => void;
}) {
  const {
    register,
    handleSubmit,
    resetField,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<AddPlayerInput>({
    resolver: zodResolver(addPlayerSchema),
    mode: "onBlur",
    // Clearing the field with `resetField` leaves `isSubmitted` true, and the
    // default `reValidateMode: "onChange"` would then validate every keystroke
    // — flashing "Enter a player name." at one character of the second name.
    reValidateMode: "onBlur",
    defaultValues: { name: "" },
  });

  const onSubmit = handleSubmit((values) => {
    const name = normalisePlayerName(values.name);
    // Names are the player's identity everywhere in the store, so a second
    // "Jordan Lee" would collide a React key and assign both at once.
    if (isDuplicatePlayerName(existingNames, name)) {
      setError("name", {
        message:
          "Someone with that name is already on the list — add a surname or initial.",
      });
      return;
    }
    onAdd(name);
    clearFieldAndRefocus<AddPlayerInput>({ resetField, setFocus }, "name");
  });

  return (
    <form noValidate onSubmit={onSubmit} style={{ marginBottom: "26px" }}>
      <Field error={errors.name?.message}>
        <FieldLabel>Player name</FieldLabel>
        {/* The button shares a row with the input, not with the whole field:
            the error renders below this row, so its appearance can no longer
            move the button. */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "stretch",
            flexWrap: "wrap",
          }}
        >
          <Input
            type="text"
            placeholder="Jordan Lee"
            style={{ flex: "1 1 200px", minWidth: 0 }}
            {...register("name")}
          />
          <Button type="submit" variant="primary" style={{ flexShrink: 0 }}>
            Add player
          </Button>
        </div>
        <FieldError />
      </Field>
    </form>
  );
}
