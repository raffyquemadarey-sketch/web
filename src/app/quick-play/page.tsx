import type { Metadata } from "next";

import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";

import { NewQuickPlayAction } from "./new-quick-play-action";
import { QuickPlayList } from "./quick-play-list";

export const metadata: Metadata = {
  title: "Quick Play",
  description:
    "Run tonight's club session: add whoever turned up, split them into teams and draw a bracket. Every quick play is public to read, and only the admin who created one can change it.",
};

export default function QuickPlayPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Quick Play"
        subtitle="Every quick play at this club, newest first. Anyone can open one; only the admin who created it can change or delete it."
        action={<NewQuickPlayAction />}
      />
      <QuickPlayList />
    </PageContainer>
  );
}
