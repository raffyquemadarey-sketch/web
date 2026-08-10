import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/cn";

export function Card({
  className,
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div className={cn("card elev-sm", className)} style={style}>
      {children}
    </div>
  );
}

/** The design's flat accent-2 placeholder block. Decorative — no image, no alt. */
export function CardMedia({ height }: { height: number }) {
  return (
    <div
      aria-hidden="true"
      className="washed"
      style={{
        height: `${height}px`,
        background: "var(--color-accent-2-200)",
        flex: "none",
      }}
    />
  );
}

export function CardKicker({ children }: { children: ReactNode }) {
  return <span className="card-kicker">{children}</span>;
}

export function CardTitle({
  className,
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <h3 className={cn("card-title", className)} style={style}>
      {children}
    </h3>
  );
}

export function CardBody({
  style,
  children,
}: {
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <p className="card-body" style={style}>
      {children}
    </p>
  );
}

export function CardMeta({ children }: { children: ReactNode }) {
  return <div className="card-meta">{children}</div>;
}
