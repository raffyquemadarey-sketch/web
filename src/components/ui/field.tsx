"use client";

import { createContext, useContext, useId } from "react";
import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * The single place form accessibility is wired: `Field` mints the ids, the label
 * gets `htmlFor`, the control gets `id` / `aria-invalid` / `aria-describedby`, and
 * the error is announced. Controls opt in by spreading `useFieldControlProps()`.
 */

type FieldContextValue = {
  id: string;
  labelId: string;
  errorId: string;
  hintId: string;
  error?: string;
  hint?: string;
};

const FieldContext = createContext<FieldContextValue | null>(null);

export type FieldControlProps = {
  id?: string;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
};

export function useFieldControlProps(): FieldControlProps {
  const field = useContext(FieldContext);
  if (!field) return {};
  const describedBy = cn(field.error && field.errorId, field.hint && field.hintId);
  return {
    id: field.id,
    ...(field.error ? { "aria-invalid": true as const } : {}),
    ...(describedBy ? { "aria-describedby": describedBy } : {}),
  };
}

/** For grouped controls, which are labelled by an element rather than a `<label>`. */
export function useFieldGroupProps(): {
  "aria-labelledby": string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
} {
  const field = useContext(FieldContext);
  if (!field) {
    throw new Error("useFieldGroupProps must be used inside <Field>.");
  }
  const describedBy = cn(field.error && field.errorId, field.hint && field.hintId);
  return {
    "aria-labelledby": field.labelId,
    ...(field.error ? { "aria-invalid": true as const } : {}),
    ...(describedBy ? { "aria-describedby": describedBy } : {}),
  };
}

export function Field({
  error,
  hint,
  className,
  style,
  children,
}: {
  error?: string;
  hint?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const uid = useId();
  const value: FieldContextValue = {
    id: `${uid}-control`,
    labelId: `${uid}-label`,
    errorId: `${uid}-error`,
    hintId: `${uid}-hint`,
    error,
    hint,
  };

  return (
    <FieldContext.Provider value={value}>
      <div className={cn("field", className)} style={style}>
        {children}
      </div>
    </FieldContext.Provider>
  );
}

function useField(): FieldContextValue {
  const field = useContext(FieldContext);
  if (!field) throw new Error("This component must be used inside <Field>.");
  return field;
}

export function FieldLabel({
  children,
  /** Set for grouped controls, where there is no single input to point at. */
  asGroupLabel = false,
}: {
  children: ReactNode;
  asGroupLabel?: boolean;
}) {
  const field = useField();
  if (asGroupLabel) {
    return <label id={field.labelId}>{children}</label>;
  }
  return (
    <label id={field.labelId} htmlFor={field.id}>
      {children}
    </label>
  );
}

export function FieldHint() {
  const field = useField();
  if (!field.hint) return null;
  return (
    <p
      id={field.hintId}
      style={{ fontSize: "12px", opacity: 0.6, margin: "5px 0 0" }}
    >
      {field.hint}
    </p>
  );
}

export function FieldError() {
  const field = useField();
  if (!field.error) return null;
  return (
    <p
      id={field.errorId}
      role="alert"
      style={{
        fontSize: "12.5px",
        margin: "5px 0 0",
        color: "var(--color-accent-800)",
      }}
    >
      {field.error}
    </p>
  );
}
