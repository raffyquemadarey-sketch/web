import { ButtonLink } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";

export default function TournamentNotFound() {
  return (
    <PageContainer width="narrow">
      <PageHeader
        title="We couldn't find that tournament"
        subtitle="The event may have been removed, or the link may be wrong."
      />
      <ButtonLink href="/tournaments" variant="primary" large>
        Browse all tournaments
      </ButtonLink>
    </PageContainer>
  );
}
