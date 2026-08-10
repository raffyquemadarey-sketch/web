import type { EliminationVM } from "@/lib/tournament/types";
import type { MatchSide } from "@/lib/validation/enums";

import { BracketRoundColumn } from "./bracket-round-column";
import { MatchCard } from "./match-card";

export function EliminationBracket({
  vm,
  onPick,
}: {
  vm: EliminationVM;
  onPick?: (key: string, side: MatchSide) => void;
}) {
  return (
    <div
      role="region"
      aria-label="Bracket"
      tabIndex={0}
      style={{
        display: "flex",
        gap: "32px",
        overflowX: "auto",
        padding: "4px 4px 14px",
      }}
    >
      {vm.winnersRounds.map((round) => (
        <BracketRoundColumn
          key={round.label}
          label={round.label}
          tone="winners"
          height={round.height}
        >
          {round.matches.map((match) => (
            <MatchCard
              key={match.key}
              match={match}
              onPick={onPick ? (side) => onPick(match.key, side) : undefined}
            />
          ))}
        </BracketRoundColumn>
      ))}

      {vm.hasLosers ? (
        <>
          <div
            aria-hidden="true"
            style={{
              width: "1px",
              background: "var(--color-neutral-200)",
              flex: "none",
              margin: "40px 0",
            }}
          />
          {vm.losersRounds.map((round) => (
            <BracketRoundColumn
              key={round.label}
              label={round.label}
              tone="losers"
              height={round.height}
            >
              {round.matches.map((match) => (
                <MatchCard
                  key={match.key}
                  match={match}
                  onPick={onPick ? (side) => onPick(match.key, side) : undefined}
                />
              ))}
            </BracketRoundColumn>
          ))}
        </>
      ) : null}

      {vm.grandFinal ? (
        <BracketRoundColumn
          label={vm.grandFinalLabel ?? "Grand final"}
          tone="grandFinal"
          centred
        >
          <MatchCard
            match={vm.grandFinal}
            elevated
            onPick={
              onPick
                ? (side) => onPick(vm.grandFinal ? vm.grandFinal.key : "gf", side)
                : undefined
            }
          />
        </BracketRoundColumn>
      ) : null}
    </div>
  );
}
