"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { teamNameSchema } from "@/lib/validation/schemas";

/** Editable team names. An invalid name is never committed to the bracket.
 *  `readOnly` renders the same grid with the same alignment, inert. */
export function TeamNameGrid({
  teams,
  onRename,
  readOnly = false,
}: {
  teams: string[];
  onRename: (index: number, name: string) => void;
  readOnly?: boolean;
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

        // Same markup, so the grid's alignment is identical. `readOnly`
        // alongside a controlled `value` with no handler is what React asks
        // for, and it is enough on its own: it is styled inert by
        // `.input[readonly]` but stays focusable and selectable, where
        // `disabled` would drop the team name out of the tab order — and the
        // name is the one thing this branch exists to show. There is no draft
        // and no error to show on this path.
        if (readOnly) {
          return (
            <div key={index}>
              <label>
                <VisuallyHidden>Team {index + 1} name</VisuallyHidden>
                <Input type="text" value={team} readOnly />
              </label>
            </div>
          );
        }

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
