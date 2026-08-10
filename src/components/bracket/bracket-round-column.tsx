import type { ReactNode } from "react";

/* The shared round-label pill, used by both bracket layouts. */

export type RoundTone = "winners" | "losers" | "grandFinal";

const TONES: Record<RoundTone, { color: string; background: string }> = {
  winners: {
    color: "var(--color-accent-700)",
    background: "var(--color-accent-100)",
  },
  losers: {
    color: "var(--color-accent-2-700)",
    background: "var(--color-accent-2-100)",
  },
  grandFinal: {
    color: "var(--color-text)",
    background: "var(--color-neutral-200)",
  },
};

export function RoundLabelPill({
  tone,
  children,
}: {
  tone: RoundTone;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display: "inline-block",
        fontSize: "11.5px",
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        borderRadius: "999px",
        padding: "4px 12px",
        marginBottom: "16px",
        ...TONES[tone],
      }}
    >
      {children}
    </div>
  );
}
