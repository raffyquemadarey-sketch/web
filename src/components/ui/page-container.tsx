import type { ReactNode } from "react";

const MAX_WIDTH = { wide: "1200px", narrow: "900px" } as const;

/** The repeated page shell: centred column with the design's fluid padding. */
export function PageContainer({
  width = "wide",
  children,
}: {
  width?: keyof typeof MAX_WIDTH;
  children: ReactNode;
}) {
  return (
    <section
      style={{
        maxWidth: MAX_WIDTH[width],
        margin: "0 auto",
        width: "100%",
        padding: "clamp(28px, 5vw, 48px) clamp(20px, 5vw, 72px) 72px",
        boxSizing: "border-box",
      }}
    >
      {children}
    </section>
  );
}
