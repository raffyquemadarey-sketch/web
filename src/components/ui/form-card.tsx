import type { ComponentProps, ReactNode } from "react";

/** The centred surface panel every form in the design sits on. */
export function FormCard({
  width,
  children,
  ...props
}: ComponentProps<"form"> & { width: 400 | 440 | 480 | 560; children: ReactNode }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px 56px",
      }}
    >
      <form
        style={{
          width: `min(${width}px, 100%)`,
          background: "var(--color-surface)",
          borderRadius: "calc(var(--radius-lg) * 1.15)",
          boxShadow: "var(--shadow-md)",
          padding: "clamp(24px, 4vw, 40px)",
        }}
        {...props}
      >
        {children}
      </form>
    </div>
  );
}
