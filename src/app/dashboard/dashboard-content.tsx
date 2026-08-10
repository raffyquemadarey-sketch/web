"use client";

import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { PhotoPlaceholder } from "@/components/ui/avatar";
import {
  Card,
  CardBody,
  CardKicker,
  CardTitle,
} from "@/components/ui/card";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Tag } from "@/components/ui/tag";
import { useDemoTournament } from "@/lib/demo/demo-data-provider";
import { useDemoSession } from "@/lib/demo/demo-session-provider";
import { roleLabel, skillLabel } from "@/lib/tournament/labels";

export function DashboardContent() {
  const { session } = useDemoSession();
  const entry = session.status === "demo-signed-in" ? session.entry : null;
  const registered = useDemoTournament(entry?.tournamentId ?? "");

  // No redirect and no fake gate: the route is public, and it says so.
  if (session.status !== "demo-signed-in") {
    return (
      <PageContainer>
        <PageHeader
          title="No demo session yet"
          subtitle="This page is not protected — nothing here is. Start a simulated session to see what a signed-in player would."
        />
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <ButtonLink href="/signin" variant="primary" large>
            Sign in
          </ButtonLink>
          <ButtonLink href="/register" variant="secondary" large>
            Create an account
          </ButtonLink>
        </div>
      </PageContainer>
    );
  }

  const { profile, isNewAccount } = session;
  const firstName = profile.name.trim().split(" ")[0];
  // The division comes from the entry itself, not the profile: a player can
  // enter a division other than the skill level on their account.
  const divisionTag = entry?.division
    ? `${skillLabel(entry.division)} singles`
    : "Squad entry";

  return (
    <PageContainer>
      <PageHeader
        title={
          isNewAccount ? `Welcome to RallyPoint, ${firstName}` : "Welcome back"
        }
        subtitle={
          isNewAccount ? "Your account's set." : "Here's what's on your calendar."
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "24px",
          alignItems: "start",
        }}
      >
        <Card style={{ padding: "24px" }}>
          <CardKicker>Next up</CardKicker>
          {registered ? (
            <>
              <CardTitle style={{ fontSize: "20px", margin: "4px 0 10px" }}>
                {registered.name}
              </CardTitle>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                  marginBottom: "14px",
                }}
              >
                <Tag tone="accent">{registered.dates}</Tag>
                <Tag tone="accent-2">{divisionTag}</Tag>
                <Tag tone="outline">Entry confirmed</Tag>
              </div>
              <CardBody style={{ marginBottom: "18px" }}>
                Draws are posted the Monday before play. You&apos;ll get an email the
                moment your first match and court are set.
              </CardBody>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <ButtonLink
                  href={`/tournaments/${registered.id}`}
                  variant="secondary"
                >
                  View draw
                </ButtonLink>
                <ButtonLink href="/tournaments" variant="ghost">
                  Browse more tournaments
                </ButtonLink>
              </div>
            </>
          ) : (
            <>
              <CardTitle style={{ fontSize: "20px", margin: "4px 0 10px" }}>
                No entries yet
              </CardTitle>
              <CardBody style={{ marginBottom: "18px" }}>
                Pick a tournament and enter — your next match will show up here.
              </CardBody>
              <ButtonLink href="/tournaments" variant="secondary">
                Browse tournaments
              </ButtonLink>
            </>
          )}
        </Card>

        <Card style={{ padding: "24px" }}>
          <CardKicker>Profile</CardKicker>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              margin: "10px 0 16px",
            }}
          >
            <PhotoPlaceholder size={52} />
            <div>
              <div
                style={{
                  fontFamily: "var(--font-heading)",
                  fontWeight: 400,
                  fontSize: "16px",
                }}
              >
                {profile.name}
              </div>
              <Tag tone="neutral">{roleLabel(profile.role)}</Tag>
            </div>
          </div>
          {profile.skill ? (
            <CardBody style={{ marginBottom: "4px" }}>
              Skill level: <strong>{skillLabel(profile.skill)}</strong>
            </CardBody>
          ) : null}
          <CardBody style={{ margin: 0 }}>Singles, doubles, mixed</CardBody>
          <p style={{ fontSize: "12px", opacity: 0.6, margin: "12px 0 0" }}>
            This profile is simulated and lives in memory.{" "}
            <Link href="/tournaments">Browse tournaments</Link> to add an entry.
          </p>
        </Card>
      </div>
    </PageContainer>
  );
}
