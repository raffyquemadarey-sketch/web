"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";

export default function Error({
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
    <PageContainer width="narrow">
      <PageHeader
        title="Something went wrong"
        subtitle="The page could not be rendered. Try again — the demo store resets on reload."
      />
      <Button variant="primary" large onClick={() => retry()}>
        Try again
      </Button>
    </PageContainer>
  );
}
