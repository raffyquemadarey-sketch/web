"use client";

import { BracketView } from "@/components/bracket/bracket-view";
import { ChampionTag } from "@/components/bracket/champion-tag";
import { useDemoTournament } from "@/lib/demo/demo-data-provider";
import { buildBracketVM } from "@/lib/tournament/bracket";
import { bracketFormatLabel } from "@/lib/tournament/labels";

/** Read-only bracket: the public page shows results, it does not record them. */
export function TournamentBracketSection({ id }: { id: string }) {
  const tournament = useDemoTournament(id);
  if (!tournament) return null;

  const vm = buildBracketVM(tournament);

  return (
    <div style={{ marginTop: "40px" }}>
      <h2 style={{ fontSize: "22px", margin: "0 0 4px" }}>Bracket</h2>
      <p style={{ fontSize: "13.5px", opacity: 0.65, margin: "0 0 18px" }}>
        {bracketFormatLabel(tournament)}
      </p>
      <BracketView vm={vm} />
      {vm.kind === "elimination" ? (
        <ChampionTag name={vm.championName} />
      ) : null}
    </div>
  );
}
