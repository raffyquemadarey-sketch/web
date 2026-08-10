import type { EliminationVM } from "@/lib/tournament/types";
import type { MatchSide } from "@/lib/validation/enums";

import { BracketSection } from "./bracket-section";
import type { BracketSectionRound } from "./bracket-section";
import styles from "./bracket.module.css";

export function EliminationBracket({
  vm,
  onPick,
}: {
  vm: EliminationVM;
  onPick?: (key: string, side: MatchSide) => void;
}) {
  // The grand final is the winners section's last column, which is where a
  // printed sheet puts the championship and gives it a connector for free.
  const winnersRounds: BracketSectionRound[] = [
    ...vm.winnersRounds.map((round) => ({ round, tone: "winners" as const })),
    ...(vm.grandFinal
      ? [
          {
            round: {
              label: vm.grandFinalLabel ?? "Grand final",
              matches: [vm.grandFinal],
            },
            tone: "grandFinal" as const,
            elevated: true,
          },
        ]
      : []),
  ];

  return (
    <div
      role="region"
      aria-label="Bracket"
      tabIndex={0}
      className={styles.scroller}
    >
      <div className={styles.sections}>
        <BracketSection
          title={vm.hasLosers ? "Winner's Bracket" : undefined}
          titleId="bracket-winners-title"
          rounds={winnersRounds}
          onPick={onPick}
        />

        {vm.hasLosers ? (
          <BracketSection
            title="Loser's Bracket"
            titleId="bracket-losers-title"
            variant="losers"
            rounds={vm.losersRounds.map((round) => ({
              round,
              tone: "losers" as const,
            }))}
            onPick={onPick}
          />
        ) : null}
      </div>
    </div>
  );
}
