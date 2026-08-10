import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TournamentDetailHeader } from "@/components/tournament/tournament-detail-header";
import { PageContainer } from "@/components/ui/page-container";
import { getTournamentById, tournamentRouteExists } from "@/lib/data/repository";

import { RegisterCta } from "./register-cta";
import { TournamentBracketSection } from "./tournament-bracket-section";
import { TournamentHeaderClient } from "./tournament-header.client";

export async function generateMetadata(
  props: PageProps<"/tournaments/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const tournament = await getTournamentById(id);
  if (!tournament) return { title: "Tournament" };
  return {
    title: tournament.name,
    description: tournament.description,
  };
}

export default async function TournamentPage(props: PageProps<"/tournaments/[id]">) {
  const { id } = await props.params;
  if (!(await tournamentRouteExists(id))) notFound();

  const tournament = await getTournamentById(id);

  return (
    <PageContainer width="narrow">
      {tournament ? (
        <TournamentDetailHeader tournament={tournament} cta={<RegisterCta id={id} />} />
      ) : (
        <TournamentHeaderClient id={id} />
      )}
      <TournamentBracketSection id={id} />
    </PageContainer>
  );
}
