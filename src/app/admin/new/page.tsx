import type { Metadata } from "next";

import { CreateTournamentForm } from "@/components/forms/create-tournament-form";

export const metadata: Metadata = {
  title: "Create tournament",
  description: "Set up a new tournament, its format, teams and courts.",
};

export default function NewTournamentPage() {
  return <CreateTournamentForm />;
}
