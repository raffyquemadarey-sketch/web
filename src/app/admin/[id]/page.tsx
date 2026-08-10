import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getTournamentById, tournamentRouteExists } from "@/lib/data/repository";

import { ManageTournament } from "./manage-tournament";

export async function generateMetadata(
  props: PageProps<"/admin/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const tournament = await getTournamentById(id);
  return { title: tournament ? `Manage ${tournament.name}` : "Manage tournament" };
}

export default async function AdminManagePage(props: PageProps<"/admin/[id]">) {
  const { id } = await props.params;
  if (!(await tournamentRouteExists(id))) notFound();

  return <ManageTournament id={id} />;
}
