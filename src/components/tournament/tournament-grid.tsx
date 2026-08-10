import type { ReactNode } from "react";

export function TournamentGrid({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: "22px",
      }}
    >
      {children}
    </div>
  );
}
