"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { teamNameSchema } from "@/lib/validation/schemas";

/** Editable team names. An invalid name is never committed to the bracket. */
export function TeamNameGrid({
  teams,
  onRename,
}: {
  teams: string[];
  onRename: (index: number, name: string) => void;
}) {
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});

  const commit = (index: number, value: string) => {
    const result = teamNameSchema.safeParse(value);
    if (!result.success) {
      setErrors((prev) => ({
        ...prev,
        [index]: result.error.issues[0].message,
      }));
      return;
    }
    setErrors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    onRename(index, result.data);
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
        gap: "10px",
      }}
    >
      {teams.map((team, index) => {
        const error = errors[index];
        return (
          <div key={index}>
            <label>
              <VisuallyHidden>Team {index + 1} name</VisuallyHidden>
              <Input
                type="text"
                value={drafts[index] ?? team}
                aria-invalid={error ? true : undefined}
                onChange={(event) =>
                  setDrafts((prev) => ({ ...prev, [index]: event.target.value }))
                }
                onBlur={(event) => commit(index, event.target.value)}
              />
            </label>
            {error ? (
              <p
                role="alert"
                style={{
                  fontSize: "12px",
                  margin: "4px 0 0",
                  color: "var(--color-accent-800)",
                }}
              >
                {error}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
