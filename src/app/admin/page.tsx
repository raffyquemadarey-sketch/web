import type { Metadata } from "next";

import { ButtonLink } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";

import { AdminTournamentList } from "./admin-tournament-list";

export const metadata: Metadata = {
  title: "Tournament admin",
  description: "Create tournaments, assign teams and record results.",
};

export default function AdminPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Tournament admin"
        subtitle="Create tournaments and record results."
        action={
          <ButtonLink href="/admin/new" variant="primary" large>
            Create tournament
          </ButtonLink>
        }
      />
      <p style={{ fontSize: "12.5px", opacity: 0.6, margin: "0 0 24px" }}>
        The admin area is open to anyone in demo mode. Access control arrives with
        the backend.
      </p>
      <AdminTournamentList />
    </PageContainer>
  );
}
