import Link from "next/link";
import type { ReactNode } from "react";

import { Tag } from "@/components/ui/tag";

export type TournamentDetailSummary = {
  name: string;
  dates: string;
  location: string;
  level: string;
  divisions: string;
  description: string;
};

export function TournamentDetailHeader({
  tournament,
  cta,
}: {
  tournament: TournamentDetailSummary;
  cta: ReactNode;
}) {
  return (
    <>
      <Link
        href="/tournaments"
        style={{
          fontSize: "13px",
          textDecoration: "underline",
          display: "inline-block",
          marginBottom: "18px",
        }}
      >
        ← All tournaments
      </Link>
      <div
        aria-hidden="true"
        className="washed"
        style={{
          height: "220px",
          background: "var(--color-accent-2-200)",
          borderRadius: "var(--radius-lg)",
          marginBottom: "24px",
        }}
      />
      <span
        style={{
          display: "block",
          fontSize: "13px",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontWeight: 600,
          color: "var(--color-accent-700)",
          marginBottom: "10px",
        }}
      >
        {tournament.dates} · {tournament.location}
      </span>
      <h1 style={{ fontSize: "clamp(30px, 4vw, 42px)", margin: "0 0 14px" }}>
        {tournament.name}
      </h1>
      <p
        style={{
          fontSize: "15.5px",
          lineHeight: 1.65,
          maxWidth: "62ch",
          opacity: 0.85,
          margin: "0 0 20px",
        }}
      >
        {tournament.description}
      </p>

      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          marginBottom: "28px",
        }}
      >
        <Tag tone="accent">{tournament.level}</Tag>
        <Tag tone="accent-2">{tournament.divisions}</Tag>
      </div>

      <div
        style={{
          background: "var(--color-accent-2-100)",
          borderRadius: "var(--radius-lg)",
          padding: "clamp(22px, 4vw, 32px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "20px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ fontSize: "20px", margin: "0 0 4px" }}>Ready to play?</h2>
          <p style={{ fontSize: "14px", opacity: 0.78, margin: 0 }}>
            Entries close a week before.
          </p>
        </div>
        {cta}
      </div>
    </>
  );
}
