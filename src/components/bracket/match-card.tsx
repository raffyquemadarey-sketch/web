import type { CSSProperties } from "react";

import { CheckIcon } from "@/components/ui/check-icon";
import type { MatchVM } from "@/lib/tournament/types";
import type { MatchSide } from "@/lib/validation/enums";

function sideStyle(match: MatchVM, side: MatchSide): CSSProperties {
  const isWinner = match.winner === side;
  const team = side === "a" ? match.a : match.b;
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    width: "100%",
    textAlign: "left",
    padding: "11px 14px",
    fontSize: "14px",
    fontFamily: "var(--font-body)",
    background: isWinner ? "var(--color-accent-100)" : "transparent",
    fontWeight: isWinner ? 600 : 400,
    opacity: match.winner ? (isWinner ? 1 : 0.42) : team ? 1 : 0.4,
    borderTop: side === "b" ? "1px solid var(--color-neutral-200)" : undefined,
  };
}

function MatchSideRow({
  match,
  side,
  onPick,
}: {
  match: MatchVM;
  side: MatchSide;
  onPick?: (side: MatchSide) => void;
}) {
  const name = side === "a" ? match.aName : match.bName;
  const style = sideStyle(match, side);

  if (!onPick) {
    return (
      <div style={style}>
        <span>{name}</span>
        {match.winner === side ? <CheckIcon /> : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={!match.canPick}
      onClick={() => onPick(side)}
      aria-pressed={match.winner === side}
      aria-label={`Record ${name} as the winner on ${match.courtLabel}`}
      style={{ ...style, border: "none", cursor: "pointer" }}
    >
      <span>{name}</span>
      {match.winner === side ? <CheckIcon /> : null}
    </button>
  );
}

export function MatchCard({
  match,
  onPick,
  elevated = false,
}: {
  match: MatchVM;
  onPick?: (side: MatchSide) => void;
  elevated?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        borderRadius: "var(--radius-md)",
        boxShadow: elevated ? "var(--shadow-md)" : "var(--shadow-sm)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          fontSize: "10.5px",
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          opacity: 0.5,
          padding: "6px 14px 5px",
          background: "var(--color-neutral-100)",
        }}
      >
        {match.courtLabel}
      </div>
      <MatchSideRow match={match} side="a" onPick={onPick} />
      <MatchSideRow match={match} side="b" onPick={onPick} />
    </div>
  );
}
