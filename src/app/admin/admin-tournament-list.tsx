"use client";

import { ButtonLink } from "@/components/ui/button";
import { Card, CardKicker, CardTitle } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { useDemoTournaments } from "@/lib/demo/demo-data-provider";
import { formatLabel } from "@/lib/tournament/labels";

export function AdminTournamentList() {
  const tournaments = useDemoTournaments();

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "22px",
      }}
    >
      {tournaments.map((tournament) => (
        <Card key={tournament.id} style={{ padding: "22px" }}>
          <CardKicker>{tournament.dates}</CardKicker>
          <CardTitle style={{ fontSize: "19px", margin: "4px 0 10px" }}>
            {tournament.name}
          </CardTitle>
          <div
            style={{
              display: "flex",
              gap: "6px",
              flexWrap: "wrap",
              marginBottom: "16px",
            }}
          >
            <Tag tone="accent-2">{formatLabel(tournament.format)}</Tag>
            <Tag tone="neutral">{tournament.teamCount} teams</Tag>
          </div>
          <ButtonLink
            href={`/admin/${tournament.id}`}
            variant="secondary"
            block
          >
            Manage bracket
          </ButtonLink>
        </Card>
      ))}
    </div>
  );
}
