import type { Metadata } from "next";

import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";

import { TournamentsList } from "./tournaments-list";

export const metadata: Metadata = {
  title: "Upcoming tournaments",
  description: "Browse club and open badminton tournaments and pick one to enter.",
};

export default function TournamentsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Upcoming tournaments"
        subtitle="Pick an event to register."
      />
      <TournamentsList />
    </PageContainer>
  );
}
