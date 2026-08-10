"use client";

import { useFieldGroupProps } from "./field";

/** A vertical stack of real radio inputs styled with the design's `.radio` dot. */
export function RadioGroup<T extends string>({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: T | undefined;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const groupProps = useFieldGroupProps();
  return (
    <div
      role="radiogroup"
      {...groupProps}
      style={{ display: "grid", gap: "var(--space-1)" }}
    >
      {options.map((option) => (
        <RadioOption
          key={option.value}
          name={name}
          value={option.value}
          label={option.label}
          checked={value === option.value}
          onChange={onChange}
        />
      ))}
    </div>
  );
}

export function RadioOption<T extends string>({
  name,
  value,
  label,
  checked,
  onChange,
}: {
  name: string;
  value: T;
  label: string;
  checked: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <label className="radio">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
      />
      <span className="dot" />
      {label}
    </label>
  );
}
