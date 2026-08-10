"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";

export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageContainer>
      <PageHeader
        title="The admin area hit an error"
        subtitle="Recorded results live in memory, so retrying may be enough. If not, reload to start from the seed data."
      />
      <Button variant="primary" large onClick={() => retry()}>
        Try again
      </Button>
    </PageContainer>
  );
}
