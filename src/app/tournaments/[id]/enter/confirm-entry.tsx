"use client";

import Link from "next/link";

import { ConfirmEntryForm } from "@/components/forms/confirm-entry-form";
import { CalloutPanel } from "@/components/ui/callout-panel";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { useDemoTournament } from "@/lib/demo/demo-data-provider";
import { useDemoSession } from "@/lib/demo/demo-session-provider";

export function ConfirmEntry({ id }: { id: string }) {
  const tournament = useDemoTournament(id);
  const { session } = useDemoSession();

  if (!tournament) {
    return (
      <PageContainer width="narrow">
        <PageHeader
          title="This demo tournament is no longer in memory"
          subtitle="Tournaments created in demo mode live in the browser only and are cleared on reload."
        />
        <Link href="/tournaments">← All tournaments</Link>
      </PageContainer>
    );
  }

  // Nothing here is gated — there is no server to gate it. We just cannot record
  // an entry without a name, so we say what is missing and where to get it.
  if (session.status !== "demo-signed-in") {
    return (
      <PageContainer width="narrow">
        <PageHeader
          title="Create an account to enter"
          subtitle={`Entering ${tournament.name} needs a name to put on the roster. Demo sign-in is simulated and grants no access.`}
        />
        <Link href={`/register?tournament=${id}`}>
          Register for {tournament.name} →
        </Link>
      </PageContainer>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px 56px",
      }}
    >
      <div
        style={{
          width: "min(440px, 100%)",
          background: "var(--color-surface)",
          borderRadius: "calc(var(--radius-lg) * 1.15)",
          boxShadow: "var(--shadow-md)",
          padding: "clamp(24px, 4vw, 40px)",
        }}
      >
        <CalloutPanel size="sm" style={{ marginBottom: "20px", fontSize: "13.5px" }}>
          Entering <strong>{tournament.name}</strong> · {tournament.dates}
        </CalloutPanel>
        <ConfirmEntryForm tournamentId={id} playerName={session.profile.name} />
      </div>
    </div>
  );
}
