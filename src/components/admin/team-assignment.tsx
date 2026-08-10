"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { CalloutPanel } from "@/components/ui/callout-panel";
import { Field } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { Tournament } from "@/lib/data/types";
import { shuffleFisherYates } from "@/lib/tournament/shuffle";
import { getCapacity, getRemainingPool } from "@/lib/tournament/teams";

import { AssignmentWheel } from "./assignment-wheel";
import { TeamNameGrid } from "./team-name-grid";

type AssignMode = "custom" | "shuffle" | "wheel";

const MODE_OPTIONS: { value: AssignMode; label: string }[] = [
  { value: "custom", label: "Custom" },
  { value: "shuffle", label: "Shuffle" },
  { value: "wheel", label: "Wheel" },
];

export function TeamAssignment({
  tournament,
  onRenameTeam,
  onShuffle,
  onAssignPlayer,
  onReset,
}: {
  tournament: Tournament;
  onRenameTeam: (index: number, name: string) => void;
  onShuffle: (pool: string[]) => void;
  onAssignPlayer: (name: string) => void;
  onReset: () => void;
}) {
  const [mode, setMode] = useState<AssignMode>("custom");

  const pool = getRemainingPool(tournament);
  const capacity = getCapacity(tournament.playType);
  const targetSlot = tournament.teamPlayers.findIndex(
    (players) => players.length < capacity,
  );

  return (
    <div style={{ marginBottom: "30px" }}>
      <h3 style={{ fontSize: "18px", margin: "0 0 12px" }}>Teams</h3>

      <Field className="mb-[18px] max-w-[420px]">
        <SegmentedControl
          name="assign-mode"
          label="Assign players"
          value={mode}
          options={MODE_OPTIONS}
          onChange={setMode}
        />
      </Field>

      {mode === "shuffle" ? (
        <CalloutPanel
          style={{
            marginBottom: "18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <p style={{ fontSize: "13.5px", margin: 0 }}>
            {pool.length} player(s) not yet on a team.
          </p>
          <div style={{ display: "flex", gap: "10px" }}>
            <Button
              variant="primary"
              onClick={() => onShuffle(shuffleFisherYates(pool))}
            >
              Shuffle into teams
            </Button>
            <Button variant="ghost" onClick={onReset}>
              Reset
            </Button>
          </div>
        </CalloutPanel>
      ) : null}

      {mode === "wheel" ? (
        <CalloutPanel
          size="lg"
          style={{
            marginBottom: "18px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <AssignmentWheel
            pool={pool}
            targetSlot={targetSlot}
            onResult={onAssignPlayer}
            onReset={onReset}
          />
        </CalloutPanel>
      ) : null}

      <TeamNameGrid teams={tournament.teams} onRename={onRenameTeam} />
    </div>
  );
}
