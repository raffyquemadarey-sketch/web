import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export type TagTone = "accent" | "accent-2" | "neutral" | "outline";

export function Tag({
  tone = "neutral",
  size = "sm",
  children,
}: {
  tone?: TagTone;
  size?: "sm" | "md";
  children: ReactNode;
}) {
  return (
    <span
      className={cn("tag", `tag-${tone}`)}
      style={size === "md" ? { fontSize: "13px", padding: "7px 14px" } : undefined}
    >
      {children}
    </span>
  );
}
