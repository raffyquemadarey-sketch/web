"use client";

import Link from "next/link";

import { TournamentDetailHeader } from "@/components/tournament/tournament-detail-header";
import { useDemoTournament } from "@/lib/demo/demo-data-provider";

import { RegisterCta } from "./register-cta";

/**
 * Header for demo-created tournaments, which exist only in client memory. The
 * server cannot see them, so this reads the store and says so plainly when a
 * reload has cleared it.
 */
export function TournamentHeaderClient({ id }: { id: string }) {
  const tournament = useDemoTournament(id);

  if (!tournament) {
    return (
      <>
        <h1 style={{ fontSize: "clamp(30px, 4vw, 42px)", margin: "0 0 14px" }}>
          This demo tournament is no longer in memory
        </h1>
        <p style={{ fontSize: "15.5px", maxWidth: "62ch", opacity: 0.85 }}>
          Tournaments created in demo mode live in the browser only and are cleared
          on reload. Nothing was lost on a server, because there is no server.
        </p>
        <Link href="/tournaments">← All tournaments</Link>
      </>
    );
  }

  return (
    <TournamentDetailHeader tournament={tournament} cta={<RegisterCta id={id} />} />
  );
}
