"use client";

import Link from "next/link";

import { RosterFitNotice } from "@/components/admin/roster-fit-notice";
import { RosterList } from "@/components/admin/roster-list";
import { ScheduleEstimateNotice } from "@/components/admin/schedule-estimate-notice";
import { TeamAssignment } from "@/components/admin/team-assignment";
import { TournamentSettings } from "@/components/admin/tournament-settings";
import { BracketView } from "@/components/bracket/bracket-view";
import { ChampionTag } from "@/components/bracket/champion-tag";
import { AddPlayerForm } from "@/components/forms/add-player-form";
import { ImportPlayersForm } from "@/components/forms/import-players-form";
import { ButtonLink } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import {
  useDemoActions,
  useQuickPlay,
  useQuickPlayId,
} from "@/lib/demo/demo-data-provider";
import { QUICK_PLAY_ID } from "@/lib/demo/quick-play";
import { useQuickPlaySync } from "@/lib/quick-play/sync-provider";
import { buildBracketVM } from "@/lib/tournament/bracket";
import { makePlayerEntry } from "@/lib/tournament/roster";

import { QuickPlaySaveStatus } from "./save-status";

/**
 * The same controls as `ManageTournament`, over a session that was never
 * registered for: it lives in the root layout's provider, so it survives
 * navigation, and `QuickPlaySyncProvider` mirrors it to its own private
 * Supabase row so it survives a reload too. `QuickPlaySaveStatus` reports on
 * that and carries the only control that empties the sheet.
 */
export function QuickPlaySession({ sessionId }: { sessionId: string }) {
  const session = useQuickPlay();
  const actions = useDemoActions();
  const openId = useQuickPlayId();
  const { status } = useQuickPlaySync();
  const id = QUICK_PLAY_ID;

  // The store is still bound to another quick play (or to none): the sync
  // provider rebinds it in its first effect. Rendering the whiteboard now would
  // flash the previous session's players. This is also what the server renders,
  // so there is no hydration mismatch to explain away.
  if (openId !== sessionId || status.kind === "starting") {
    return (
      <PageContainer>
        <PageHeader title="Quick Play" subtitle="Opening this quick play…" />
      </PageContainer>
    );
  }

  // "Not yours" and "does not exist" are one case on purpose — see the RLS note
  // in the migration. Nothing here reveals which.
  if (status.kind === "missing" || status.kind === "off") {
    return (
      <PageContainer>
        <PageHeader
          title="We couldn't open that quick play"
          subtitle={
            status.kind === "off"
              ? "This site has no Supabase project configured, so there are no saved quick plays to open."
              : "There's no quick play at this address for this browser. Quick plays are private to the browser that made them, so a link from another device, another browser or a private window won't open here."
          }
        />
        <ButtonLink href="/quick-play" variant="primary" large>
          Back to Quick Play
        </ButtonLink>
      </PageContainer>
    );
  }

  const vm = buildBracketVM(session);

  return (
    <PageContainer>
      <Link
        href="/quick-play"
        style={{
          fontSize: "13px",
          textDecoration: "underline",
          display: "inline-block",
          marginBottom: "16px",
        }}
      >
        ← Quick Play
      </Link>
      <PageHeader
        title={session.name}
        subtitle="Add players, pick a format and draw a bracket. Every change saves itself to this quick play."
      />

      <QuickPlaySaveStatus />

      <AddPlayerForm
        existingNames={session.roster.map((player) => player.name)}
        onAdd={(name) => actions.addRosterEntry(id, makePlayerEntry(name))}
      />

      <ImportPlayersForm
        existingNames={session.roster.map((player) => player.name)}
        onImport={(names) => {
          for (const name of names) {
            actions.addRosterEntry(id, makePlayerEntry(name));
          }
        }}
      />

      <RosterList
        roster={session.roster}
        title="Players"
        emptyMessage="No players yet — add the first one above."
        showSkill={false}
        onRemove={(name) => actions.removeRosterEntry(id, name)}
      />

      <TournamentSettings
        idPrefix="quick"
        format={session.format}
        teamCount={session.teamCount}
        courtCount={session.courtCount}
        playType={session.playType}
        matchMinutes={session.matchMinutes}
        sessionMinutes={session.sessionMinutes}
        onFormatChange={(format) => actions.setFormat(id, format)}
        onTeamCountChange={(teamCount) => actions.setTeamCount(id, teamCount)}
        onCourtCountChange={(courtCount) => actions.setCourtCount(id, courtCount)}
        onPlayTypeChange={(playType) => actions.setPlayType(id, playType)}
        onMatchMinutesChange={(minutes) => actions.setMatchMinutes(id, minutes)}
        onSessionMinutesChange={(minutes) => actions.setSessionMinutes(id, minutes)}
      />

      <RosterFitNotice
        playerCount={session.roster.length}
        playType={session.playType}
        teamCount={session.teamCount}
        rosterVerb="been added"
        onUseSuggestion={(teamCount) => actions.setTeamCount(id, teamCount)}
      />

      <ScheduleEstimateNotice
        format={session.format}
        teamCount={session.teamCount}
        courtCount={session.courtCount}
        matchMinutes={session.matchMinutes}
        sessionMinutes={session.sessionMinutes}
      />

      <TeamAssignment
        tournament={session}
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
