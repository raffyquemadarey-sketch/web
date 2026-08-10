"use client";

import { ButtonLink } from "@/components/ui/button";
import { useDemoSession } from "@/lib/demo/demo-session-provider";

export function RegisterCta({ id }: { id: string }) {
  const { session } = useDemoSession();
  const href =
    session.status === "demo-signed-in"
      ? `/tournaments/${id}/enter`
      : `/register?tournament=${id}`;

  return (
    <ButtonLink href={href} variant="primary" large style={{ flex: "none" }}>
      Register for this tournament
    </ButtonLink>
  );
}
