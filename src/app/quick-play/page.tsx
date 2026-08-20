import type { Metadata } from "next";

import { ButtonLink } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";

import { QuickPlayList } from "./quick-play-list";

export const metadata: Metadata = {
  title: "Quick Play",
  description:
    "Run tonight's club session: add whoever turned up, split them into teams and draw a bracket. Every quick play is saved under its own title.",
};

export default function QuickPlayPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Quick Play"
        subtitle="Every quick play you've started in this browser, newest first."
        action={
          // Always rendered: `/quick-play/new` is where an unconfigured project
          // is explained, so the header does not need to know.
          <ButtonLink href="/quick-play/new" variant="primary" large>
            New quick play
          </ButtonLink>
        }
      />
      <QuickPlayList />
    </PageContainer>
  );
}
