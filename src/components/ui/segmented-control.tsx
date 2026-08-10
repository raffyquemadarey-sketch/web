"use client";

import type { CSSProperties } from "react";

import { FieldLabel, useFieldGroupProps } from "./field";

/**
 * The design's `.seg` control, built on real radio inputs so arrow-key navigation
 * and the `:has(input:checked)` styling both come for free. Must live in a `Field`.
 */
export function SegmentedControl<T extends string>({
  name,
  label,
  value,
  options,
  onChange,
  columns,
}: {
  name: string;
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  columns?: number;
}) {
  const groupProps = useFieldGroupProps();
  const style: CSSProperties = columns
    ? { display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, width: "100%" }
    : { width: "100%" };

  return (
    <>
      <FieldLabel asGroupLabel>{label}</FieldLabel>
      <div className="seg" role="radiogroup" {...groupProps} style={style}>
        {options.map((option) => (
          <label
            key={option.value}
            className="seg-opt"
            style={{ flex: 1, justifyContent: "center" }}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </>
  );
}
