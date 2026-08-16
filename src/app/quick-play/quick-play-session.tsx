"use client";

import { RosterFitNotice } from "@/components/admin/roster-fit-notice";
import { RosterList } from "@/components/admin/roster-list";
import { ScheduleEstimateNotice } from "@/components/admin/schedule-estimate-notice";
import { TeamAssignment } from "@/components/admin/team-assignment";
import { TournamentSettings } from "@/components/admin/tournament-settings";
import { BracketView } from "@/components/bracket/bracket-view";
import { ChampionTag } from "@/components/bracket/champion-tag";
import { AddPlayerForm } from "@/components/forms/add-player-form";
import { ImportPlayersForm } from "@/components/forms/import-players-form";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { useDemoActions, useQuickPlay } from "@/lib/demo/demo-data-provider";
import { QUICK_PLAY_ID } from "@/lib/demo/quick-play";
import { buildBracketVM } from "@/lib/tournament/bracket";
import { makePlayerEntry } from "@/lib/tournament/roster";

/**
 * The same controls as `ManageTournament`, over a session that was never
 * registered for and is never saved: it lives in the root layout's provider, so
 * it survives navigation and dies on reload.
 */
export function QuickPlaySession() {
  const session = useQuickPlay();
  const actions = useDemoActions();
  const id = QUICK_PLAY_ID;

  const vm = buildBracketVM(session);

  return (
    <PageContainer>
      <PageHeader
        title="Quick Play"
        subtitle="Add players by hand, pick a format and draw a bracket. Nothing here is saved — reload the page and you get a clean sheet."
      />

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
