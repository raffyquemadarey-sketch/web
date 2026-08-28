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
import { Button, ButtonLink } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { isOwner } from "@/lib/auth/viewer";
import { useViewer } from "@/lib/auth/viewer-provider";
import {
  useDemoActions,
  useQuickPlay,
  useQuickPlayId,
} from "@/lib/demo/demo-data-provider";
import { QUICK_PLAY_ID } from "@/lib/demo/quick-play";
import { useQuickPlaySync } from "@/lib/quick-play/sync-provider";
import { isOpening } from "@/lib/quick-play/sync-status";
import { buildBracketVM } from "@/lib/tournament/bracket";
import { makePlayerEntry } from "@/lib/tournament/roster";

import { QuickPlaySaveStatus, QuickPlayViewerNote } from "./save-status";

/**
 * The same controls as `ManageTournament`, over a session that was never
 * registered for: it lives in the root layout's provider, so it survives
 * navigation, and `QuickPlaySyncProvider` mirrors it to a Supabase row anyone
 * can read so it survives a reload too.
 *
 * Every mutating control renders only for the admin who created this quick play,
 * and that is cosmetic — the update and delete policies on
 * `quick_play_sessions` are what actually refuse everyone else, whether this
 * component gets it right or not. Controls
 * whose absence teaches a viewer nothing are hidden; the settings grid is shown
 * and disabled, because the session's shape is information a viewer came for.
 */
export function QuickPlaySession({ sessionId }: { sessionId: string }) {
  const session = useQuickPlay();
  const actions = useDemoActions();
  const openId = useQuickPlayId();
  const { status, retryLoad, createdBy } = useQuickPlaySync();
  const viewer = useViewer();
  const canEdit = isOwner(viewer, createdBy);
  const id = QUICK_PLAY_ID;

  // Two things that both mean "there is no quick play to show yet". The store
  // is still bound to another quick play (or to none), because the sync provider
  // rebinds it in its first effect — rendering now would flash the previous
  // session's players. And `isOpening` covers every status before the read
  // resolves: the sheet in memory during those is a blank default that belongs
  // to no session, and the account that owns this one is not known either, so
  // neither the whiteboard nor a word about who may change it can be put on
  // screen truthfully. `starting` is also what the server renders, so there is
  // no hydration mismatch to explain away.
  if (openId !== sessionId || isOpening(status)) {
    return (
      <PageContainer>
        <PageHeader
          title="Quick Play"
          subtitle={
            status.kind === "reloading"
              ? "Trying again…"
              : "Opening this quick play…"
          }
        />
      </PageContainer>
    );
  }

  // Reads are public, so `missing` has only one meaning left: the row is not
  // there.
  if (status.kind === "missing" || status.kind === "off") {
    return (
      <PageContainer>
        <PageHeader
          title="We couldn't open that quick play"
          subtitle={
            status.kind === "off"
              ? "This site has no Supabase project configured, so there are no saved quick plays to open."
              : "There's no quick play at this address. It may have been deleted, or the link may be wrong."
          }
        />
        <ButtonLink href="/quick-play" variant="primary" large>
          Back to Quick Play
        </ButtonLink>
      </PageContainer>
    );
  }

  // A read that failed, which is a different thing from a row that is not
  // there, and the only screen below that neither an admin nor a viewer may be
  // shown. `session` right now is the blank sheet `openQuickPlay` binds while
  // the read is in flight — not this quick play, and not anybody's. Rendering
  // it would put "Players (0)", four default teams and an empty bracket on
  // screen with nothing anywhere to say that none of it was loaded, which is
  // the app stating something false with full confidence. So: the reason, and
  // the retry. Everyone sees this, because it is true for everyone — the read
  // is public and identical for a signed-out viewer and an admin.
  if (status.kind === "load-failed") {
    return (
      <PageContainer>
        <PageHeader
          title="We couldn't load this quick play"
          subtitle={`Reading it failed — ${status.message}. None of this session loaded, so none of it is shown. Nothing has been changed.`}
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
          {/* Retry rather than "reload the page": the load is one request, and
              running it again keeps the tab, its history and its scroll where
              they are. */}
          <Button variant="primary" large onClick={retryLoad}>
            Try again
          </Button>
          <ButtonLink href="/quick-play" variant="secondary" large>
            Back to Quick Play
          </ButtonLink>
        </div>
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
        subtitle={
          canEdit
            ? "Add players, pick a format and draw a bracket. Every change saves itself to this quick play."
            : "Players, teams and the bracket for this session, as the admin who created it left them."
        }
      />

      {canEdit ? (
        <QuickPlaySaveStatus />
      ) : (
        <QuickPlayViewerNote viewer={viewer} />
      )}

      {/* Hidden, not disabled: a dead text field with a dead "Add player"
          button beside it is furniture that teaches a viewer nothing. */}
      {canEdit ? (
        <AddPlayerForm
          existingNames={session.roster.map((player) => player.name)}
          onAdd={(name) => actions.addRosterEntry(id, makePlayerEntry(name))}
        />
      ) : null}

      {canEdit ? (
        <ImportPlayersForm
          existingNames={session.roster.map((player) => player.name)}
          onImport={(names) => {
            for (const name of names) {
              actions.addRosterEntry(id, makePlayerEntry(name));
            }
          }}
        />
      ) : null}

      {/* `RosterList` drops the × when `onRemove` is absent — same reasoning. */}
      <RosterList
        roster={session.roster}
        title="Players"
        emptyMessage={
          canEdit
            ? "No players yet — add the first one above."
            : "No players yet."
        }
        showSkill={false}
        onRemove={canEdit ? (name) => actions.removeRosterEntry(id, name) : undefined}
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
        disabled={!canEdit}
      />

      <RosterFitNotice
        playerCount={session.roster.length}
        playType={session.playType}
        teamCount={session.teamCount}
        rosterVerb="been added"
        onUseSuggestion={
          canEdit ? (teamCount) => actions.setTeamCount(id, teamCount) : undefined
        }
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
        readOnly={!canEdit}
      />

      <h3 style={{ fontSize: "18px", margin: "0 0 6px" }}>Bracket</h3>
      <p style={{ fontSize: "13px", opacity: 0.65, margin: "0 0 16px" }}>
        {canEdit ? "Click a team to record the winner." : "Winners recorded so far."}
      </p>
      {/* `MatchCard` already renders static rows when `onPick` is absent, so no
          bracket component needs to know about any of this. */}
      <BracketView
        vm={vm}
        onPick={
          canEdit ? (key, side) => actions.setDecision(id, key, side) : undefined
        }
      />
      {vm.kind === "elimination" ? <ChampionTag name={vm.championName} /> : null}
    </PageContainer>
  );
}
