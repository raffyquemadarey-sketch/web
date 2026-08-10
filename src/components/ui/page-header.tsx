import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const heading = (
    <div>
      <h1 style={{ fontSize: "clamp(28px, 3.4vw, 36px)", margin: "0 0 6px" }}>
        {title}
      </h1>
      {subtitle ? (
        <p
          style={{
            fontSize: "15px",
            lineHeight: 1.6,
            opacity: 0.75,
            margin: 0,
            maxWidth: "60ch",
          }}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );

  if (!action) {
    return <div style={{ marginBottom: "32px" }}>{heading}</div>;
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "20px",
        flexWrap: "wrap",
        marginBottom: "28px",
      }}
    >
      {heading}
      {action}
    </div>
  );
}
