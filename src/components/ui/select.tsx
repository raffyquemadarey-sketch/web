"use client";

import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

import { useFieldControlProps } from "./field";

export type SelectOption = { value: string; label: string };

export function Select({
  options,
  className,
  ...props
}: Omit<ComponentProps<"select">, "children"> & { options: SelectOption[] }) {
  const fieldProps = useFieldControlProps();
  return (
    <select className={cn("input", className)} {...fieldProps} {...props}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
