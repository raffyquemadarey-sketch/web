"use client";

import Link from "next/link";

import { RosterFitNotice } from "@/components/admin/roster-fit-notice";
import { RosterList } from "@/components/admin/roster-list";
import { ScheduleEstimateNotice } from "@/components/admin/schedule-estimate-notice";
import { TeamAssignment } from "@/components/admin/team-assignment";
import { TournamentSettings } from "@/components/admin/tournament-settings";
import { BracketView } from "@/components/bracket/bracket-view";
import { ChampionTag } from "@/components/bracket/champion-tag";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { useDemoActions, useDemoTournament } from "@/lib/demo/demo-data-provider";
import { buildBracketVM } from "@/lib/tournament/bracket";

export function ManageTournament({ id }: { id: string }) {
  const tournament = useDemoTournament(id);
  const actions = useDemoActions();

  if (!tournament) {
    return (
      <PageContainer>
        <PageHeader
          title="This demo tournament is no longer in memory"
          subtitle="Tournaments created in demo mode live in the browser only and are cleared on reload. Nothing was lost on a server, because there is no server."
        />
        <Link href="/admin">← Admin</Link>
      </PageContainer>
    );
  }

  const vm = buildBracketVM(tournament);

  return (
    <PageContainer>
      <Link
        href="/admin"
        style={{
          fontSize: "13px",
          textDecoration: "underline",
          display: "inline-block",
          marginBottom: "16px",
        }}
      >
        ← Admin
      </Link>
      <h1 style={{ fontSize: "clamp(26px, 3vw, 32px)", margin: "0 0 6px" }}>
        {tournament.name}
      </h1>
      <p style={{ fontSize: "14px", opacity: 0.7, margin: "0 0 26px" }}>
        {tournament.dates} · {tournament.location}
      </p>

      <RosterList roster={tournament.roster} />

      <TournamentSettings
        idPrefix="manage"
        format={tournament.format}
        teamCount={tournament.teamCount}
        courtCount={tournament.courtCount}
        playType={tournament.playType}
        matchMinutes={tournament.matchMinutes}
        sessionMinutes={tournament.sessionMinutes}
        onFormatChange={(format) => actions.setFormat(id, format)}
        onTeamCountChange={(teamCount) => actions.setTeamCount(id, teamCount)}
        onCourtCountChange={(courtCount) => actions.setCourtCount(id, courtCount)}
        onPlayTypeChange={(playType) => actions.setPlayType(id, playType)}
        onMatchMinutesChange={(minutes) => actions.setMatchMinutes(id, minutes)}
        onSessionMinutesChange={(minutes) => actions.setSessionMinutes(id, minutes)}
      />

      <RosterFitNotice
        playerCount={tournament.roster.length}
        playType={tournament.playType}
        teamCount={tournament.teamCount}
        onUseSuggestion={(teamCount) => actions.setTeamCount(id, teamCount)}
      />

      <ScheduleEstimateNotice
        format={tournament.format}
        teamCount={tournament.teamCount}
        courtCount={tournament.courtCount}
        matchMinutes={tournament.matchMinutes}
        sessionMinutes={tournament.sessionMinutes}
      />

      <TeamAssignment
        tournament={tournament}
        onRenameTeam={(index, name) => actions.setTeamName(id, index, name)}
        onShuffle={(pool) => actions.shuffleIntoTeams(id, pool)}
        onAssignPlayer={(name) => actions.assignPlayer(id, name)}
        onReset={() => actions.resetAssignments(id)}
      />

      <h3 style={{ fontSize: "18px", margin: "0 0 6px" }}>Bracket</h3>
      <p style={{ fontSize: "13px", opacity: 0.65, margin: "0 0 16px" }}>
        Click a team to record the winner.
      </p>
      <BracketView
        vm={vm}
        onPick={(key, side) => actions.setDecision(id, key, side)}
      />
      {vm.kind === "elimination" ? <ChampionTag name={vm.championName} /> : null}
    </PageContainer>
  );
}
