"use client";

import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

import { useFieldControlProps } from "./field";

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  const fieldProps = useFieldControlProps();
  return <textarea className={cn("input", className)} {...fieldProps} {...props} />;
}
