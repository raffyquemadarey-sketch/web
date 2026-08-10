import { ButtonLink } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";

export default function AdminTournamentNotFound() {
  return (
    <PageContainer>
      <PageHeader
        title="We couldn't find that tournament"
        subtitle="There is no tournament with that id to manage."
      />
      <ButtonLink href="/admin" variant="primary" large>
        Back to admin
      </ButtonLink>
    </PageContainer>
  );
}
