import type { CSSProperties, ReactNode } from "react";

export type CalloutSize = "sm" | "md" | "lg";

const PADDING: Record<CalloutSize, string> = {
  sm: "12px 16px",
  md: "18px 20px",
  lg: "clamp(22px, 4vw, 32px)",
};

/** The recurring accent-2 panel: landing CTA, entry notice, shuffle bar, wheel. */
export function CalloutPanel({
  size = "md",
  radius = "var(--radius-lg)",
  style,
  children,
}: {
  size?: CalloutSize;
  radius?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--color-accent-2-100)",
        borderRadius: radius,
        padding: PADDING[size],
        ...style,
      }}
    >
      {children}
    </div>
  );
}
