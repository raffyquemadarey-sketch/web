"use client";

import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

import { useFieldControlProps } from "./field";

// React 19 passes `ref` through `ComponentProps`, so no forwardRef is needed.
export function Input({ className, ...props }: ComponentProps<"input">) {
  const fieldProps = useFieldControlProps();
  return <input className={cn("input", className)} {...fieldProps} {...props} />;
}
