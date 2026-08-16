import type { Metadata } from "next";

import { RegisterForm } from "@/components/forms/register-form";
import { getTournamentById } from "@/lib/data/repository";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Register once and enter club and open badminton tournaments.",
};

export default async function RegisterPage(props: PageProps<"/register">) {
  const { tournament: tournamentParam } = await props.searchParams;
  const id = typeof tournamentParam === "string" ? tournamentParam : null;
  const tournament = id ? await getTournamentById(id) : null;

  return (
    <RegisterForm
      tournament={
        tournament
          ? {
              id: tournament.id,
              name: tournament.name,
              startDate: tournament.startDate,
              endDate: tournament.endDate,
            }
          : undefined
      }
    />
  );
}
