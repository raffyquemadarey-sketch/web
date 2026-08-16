import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardKicker, CardMedia, CardTitle } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import type { Tournament } from "@/lib/data/types";
import { formatTournamentDates } from "@/lib/tournament/dates";

export function TournamentCard({ tournament }: { tournament: Tournament }) {
  const href = `/tournaments/${tournament.id}`;
  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <CardMedia height={130} />
      <div
        style={{
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          flex: 1,
        }}
      >
        <CardKicker>
          {formatTournamentDates(tournament.startDate, tournament.endDate)}
        </CardKicker>
        <CardTitle style={{ fontSize: "19px", margin: 0 }}>
          <Link href={href} style={{ color: "inherit", textDecoration: "none" }}>
            {tournament.name}
          </Link>
        </CardTitle>
        <CardBody style={{ margin: 0 }}>{tournament.location}</CardBody>
        <div
          style={{
            display: "flex",
            gap: "6px",
            flexWrap: "wrap",
            marginTop: "4px",
          }}
        >
          <Tag tone="accent">{tournament.level}</Tag>
        </div>
        <ButtonLink
          href={href}
          variant="secondary"
          block
          style={{ marginTop: "10px" }}
        >
          View &amp; register
        </ButtonLink>
      </div>
    </Card>
  );
}
