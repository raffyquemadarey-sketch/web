import type { ReactNode } from "react";

const style = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
  border: 0,
} as const;

export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span style={style}>{children}</span>;
}

/** Same treatment for a table caption, which cannot be wrapped in a span. */
export const visuallyHiddenStyle = style;
