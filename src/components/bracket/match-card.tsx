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
    height: "var(--match-side-h, 58px)",
    textAlign: "left",
    padding: "0 14px",
    fontSize: "14px",
    fontFamily: "var(--font-body)",
    background: isWinner ? "var(--color-accent-100)" : "transparent",
    fontWeight: isWinner ? 600 : 400,
    opacity: match.winner ? (isWinner ? 1 : 0.42) : team ? 1 : 0.4,
    borderTop: side === "b" ? "1px solid var(--color-neutral-200)" : undefined,
  };
}

/* Wraps to two lines, then ellipsises. `anywhere` (not `break-word`) is what
   shrinks the span's min-content size, so a long unbroken name cannot widen the
   card. The explicit line height is what lets the row reserve exactly the two
   lines the clamp allows, so the card's height is fixed. The full name stays in
   the text node for screen readers. */
const NAME_STYLE: CSSProperties = {
  minWidth: 0,
  overflowWrap: "anywhere",
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: 2,
  overflow: "hidden",
  lineHeight: "18px",
  maxHeight: "36px",
};

function MatchSideRow({
  match,
  side,
  onPick,
}: {
  match: MatchVM;
  side: MatchSide;
  onPick?: (side: MatchSide) => void;
}) {
  const team = side === "a" ? match.a : match.b;
  const source = side === "a" ? match.aSource : match.bSource;
  // A slot is either a real team — including one that walked in on a bye, since
  // the BYE sentinel never reaches a card — or null, in which case it names the
  // match its occupant will come from.
  const pending = team === null ? source : null;
  const name = side === "a" ? match.aName : match.bName;
  const text = pending ? pending.label : name;
  const hint = pending ? pending.description : name;
  const style = sideStyle(match, side);

  if (!onPick) {
    return (
      <div style={style}>
        <span style={NAME_STYLE} title={hint}>
          {text}
        </span>
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
      aria-label={
        pending
          ? `${pending.description}, not yet decided`
          : `Record ${name} as the winner on ${match.courtLabel}`
      }
      style={{
        ...style,
        /* A button arrives with the browser's own frame, which has to go — but
           the `border` shorthand would also wipe the divider `sideStyle` hangs
           on side b, so the edges are cleared one at a time. */
        borderTop: style.borderTop ?? "none",
        borderRight: "none",
        borderBottom: "none",
        borderLeft: "none",
        cursor: "pointer",
      }}
    >
      <span style={NAME_STYLE} title={hint}>
        {text}
      </span>
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
        border: "1px solid var(--color-divider)",
        borderRadius: "var(--radius-md)",
        boxShadow: elevated ? "var(--shadow-lg)" : "var(--shadow-md)",
        overflow: "hidden",
        flexShrink: 0,
        height: "var(--match-card-h, 143px)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "var(--match-header-h, 26px)",
          fontSize: "10.5px",
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          opacity: 0.5,
          padding: "0 14px",
          background: "var(--color-neutral-100)",
        }}
      >
        <span>Match {match.playNumber}</span>
        <span>{match.courtLabel}</span>
      </div>
      <MatchSideRow match={match} side="a" onPick={onPick} />
      <MatchSideRow match={match} side="b" onPick={onPick} />
    </div>
  );
}
