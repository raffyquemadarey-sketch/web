import { Fragment } from "react";
import type { CSSProperties } from "react";

import type { RoundVM } from "@/lib/tournament/types";
import type { MatchSide } from "@/lib/validation/enums";

import { layoutSection } from "./bracket-layout";
import type { RoundTone } from "./bracket-round-column";
import { RoundLabelPill } from "./bracket-round-column";
import { MatchCard } from "./match-card";
import styles from "./bracket.module.css";

export type BracketSectionRound = {
  round: RoundVM;
  tone: RoundTone;
  elevated?: boolean;
};

/** One half of the sheet — a whole bracket laid out as a tree of columns. */
export function BracketSection({
  title,
  titleId,
  variant = "winners",
  rounds,
  onPick,
}: {
  title?: string;
  titleId?: string;
  variant?: "winners" | "losers";
  rounds: BracketSectionRound[];
  onPick?: (key: string, side: MatchSide) => void;
}) {
  const layout = layoutSection(rounds.map((r) => r.round));

  return (
    <section
      className={variant === "losers" ? styles.losersSection : undefined}
      aria-labelledby={title ? titleId : undefined}
    >
      {title ? (
        <div id={titleId} className={styles.sectionTitle}>
          {title}
        </div>
      ) : null}

      <div
        className={styles.grid}
        style={{
          gridTemplateColumns: `repeat(${layout.columns}, var(--bracket-col))`,
          gridTemplateRows: `auto repeat(${layout.rows}, var(--bracket-row))`,
        }}
      >
        {rounds.map(({ round, tone, elevated }, columnIdx) => (
          <Fragment key={round.label}>
            <div style={{ gridColumn: columnIdx + 1, gridRow: 1 }}>
              <RoundLabelPill tone={tone}>{round.label}</RoundLabelPill>
            </div>

            {round.matches.map((match) => {
              const placement = layout.placements.get(match.key);
              if (!placement) return null;

              return (
                <div
                  key={match.key}
                  className={[
                    styles.cell,
                    placement.hasIncoming && styles.cellIncoming,
                    placement.riserHeightPct !== null && styles.cellRiser,
                    placement.hasOutgoing && styles.cellOutgoing,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={
                    {
                      gridColumn: placement.column,
                      gridRow: `${placement.rowStart + 1} / span ${placement.rowSpan}`,
                      "--card-centre": `${placement.cardCentrePct}%`,
                      ...(placement.riserTopPct !== null
                        ? {
                            "--riser-top": `${placement.riserTopPct}%`,
                            "--riser-height": `${placement.riserHeightPct}%`,
                          }
                        : {}),
                    } as CSSProperties
                  }
                >
                  <div className={styles.card}>
                    <MatchCard
                      match={match}
                      elevated={elevated}
                      onPick={onPick ? (side) => onPick(match.key, side) : undefined}
                    />
                  </div>
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </section>
  );
}
