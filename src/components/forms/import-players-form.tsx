"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";

import { buttonClassName } from "@/components/ui/button";
import { Field, FieldError, FieldHint, FieldLabel } from "@/components/ui/field";
import { visuallyHiddenStyle } from "@/components/ui/visually-hidden";
import { collectNames, describeImport } from "@/lib/import/names";
import { readSpreadsheet } from "@/lib/import/read-spreadsheet";

const ACCEPT = [
  ".xlsx",
  ".csv",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
].join(",");

/**
 * A whole roster at once, from the club's existing spreadsheet. Additive — the
 * names land on top of whatever has already been typed in, deduplicated against
 * it — and the parser is behind a dynamic import, so picking no file costs the
 * page nothing.
 */
export function ImportPlayersForm({
  existingNames,
  onImport,
}: {
  existingNames: readonly string[];
  onImport: (names: readonly string[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function onChange(event: ChangeEvent<HTMLInputElement>) {
    if (busy) return;
    const file = event.target.files?.[0];
    // The dialog was cancelled — leave the last result on screen.
    if (!file) return;

    setFileName(file.name);
    setStatus("");
    setError("");
    setBusy(true);

    try {
      const read = await readSpreadsheet(file);
      if (!read.ok) {
        setError(read.message);
        return;
      }
      const outcome = collectNames(read.rows, existingNames);
      if (outcome.names.length > 0) onImport(outcome.names);
      setStatus(describeImport(outcome, file.name));
    } finally {
      setBusy(false);
      // Without this the same file picked twice in a row fires no `change` event
      // the second time.
      event.target.value = "";
    }
  }

  return (
    <div style={{ marginBottom: "26px" }}>
      <Field
        error={error || undefined}
        hint="We read the first sheet's first non-empty column, one name per row, and skip a heading like 'Name'."
      >
        <FieldLabel asGroupLabel>Import from a spreadsheet</FieldLabel>
        {/* Same shape as the single-add row: the messages below cannot move the
            control when they appear. */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "stretch",
            flexWrap: "wrap",
          }}
        >
          {/* The file input itself is unstylable, so it is clipped inside a label
              that carries the button styling. `visuallyHiddenStyle` clips rather
              than hides, so the input still takes focus — hence `focus-within`. */}
          <label
            className={buttonClassName({
              variant: "secondary",
              className: "focus-within:outline-2 focus-within:outline-offset-2",
            })}
            style={{ flexShrink: 0 }}
          >
            {busy ? "Reading…" : "Choose file"}
            <input
              type="file"
              accept={ACCEPT}
              disabled={busy}
              onChange={onChange}
              style={visuallyHiddenStyle}
            />
          </label>
          <span
            style={{
              alignSelf: "center",
              fontSize: "13px",
              opacity: 0.65,
              minWidth: 0,
              overflowWrap: "anywhere",
            }}
          >
            {fileName}
          </span>
        </div>
        <FieldHint />
        <FieldError />
        {/* Rendered from first paint, empty until an import runs: a live region
            added to the DOM at the same time as its text is not announced. */}
        <p
          role="status"
          aria-live="polite"
          style={{ fontSize: "13px", margin: "5px 0 0" }}
        >
          {status}
        </p>
      </Field>
    </div>
  );
}
