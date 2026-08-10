"use client";

import { TournamentCard } from "@/components/tournament/tournament-card";
import { TournamentGrid } from "@/components/tournament/tournament-grid";
import { useDemoTournaments } from "@/lib/demo/demo-data-provider";

/** Reads the demo store so admin-created tournaments show up here too. */
export function TournamentsList() {
  const tournaments = useDemoTournaments();
  return (
    <TournamentGrid>
      {tournaments.map((tournament) => (
        <TournamentCard key={tournament.id} tournament={tournament} />
      ))}
    </TournamentGrid>
  );
}
