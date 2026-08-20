import { ButtonLink } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";

export default function QuickPlayNotFound() {
  return (
    <PageContainer>
      <PageHeader
        title="We couldn't find that quick play"
        subtitle="That link isn't a quick play address."
      />
      <ButtonLink href="/quick-play" variant="primary" large>
        Back to Quick Play
      </ButtonLink>
    </PageContainer>
  );
}
