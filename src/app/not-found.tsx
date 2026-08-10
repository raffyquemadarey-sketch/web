import { ButtonLink } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";

export default function NotFound() {
  return (
    <PageContainer width="narrow">
      <PageHeader
        title="Page not found"
        subtitle="That page does not exist. It may have moved, or the link may be out of date."
      />
      <ButtonLink href="/" variant="primary" large>
        Back to the home page
      </ButtonLink>
    </PageContainer>
  );
}
