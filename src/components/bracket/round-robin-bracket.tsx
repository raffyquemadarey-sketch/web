import type { CSSProperties } from "react";

import { CheckIcon } from "@/components/ui/check-icon";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import type { RoundRobinMatchVM, RoundRobinVM } from "@/lib/tournament/types";
import type { MatchSide } from "@/lib/validation/enums";

import { RoundLabelPill } from "./bracket-round-column";

function sideStyle(match: RoundRobinMatchVM, side: MatchSide): CSSProperties {
  const isWinner = match.winner === side;
  return {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    textAlign: "left",
    background: isWinner ? "var(--color-accent-100)" : "transparent",
    fontWeight: isWinner ? 600 : 400,
    opacity: match.winner ? (isWinner ? 1 : 0.42) : 1,
    fontSize: "14px",
    fontFamily: "var(--font-body)",
    padding: "4px 8px",
    borderRadius: "var(--radius-sm)",
  };
}

function MatchSideCell({
  match,
  side,
  onPick,
}: {
  match: RoundRobinMatchVM;
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

export function RoundRobinBracket({
  vm,
  onPick,
}: {
  vm: RoundRobinVM;
  onPick?: (key: string, side: MatchSide) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: "30px",
        alignItems: "start",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        {vm.scheduleRounds.map((round) => (
          <div key={round.label}>
            <RoundLabelPill tone="winners">{round.label}</RoundLabelPill>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {round.matches.map((match) => (
                <div
                  key={match.key}
                  style={{
                    background: "var(--color-surface)",
                    borderRadius: "var(--radius-md)",
                    boxShadow: "var(--shadow-sm)",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 14px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10.5px",
                      fontWeight: 600,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      opacity: 0.5,
                      flex: "none",
                      width: "62px",
                    }}
                  >
                    {match.courtLabel}
                  </span>
                  <MatchSideCell
                    match={match}
                    side="a"
                    onPick={onPick ? (side) => onPick(match.key, side) : undefined}
                  />
                  <span style={{ opacity: 0.4, fontSize: "12px", flex: "none" }}>
                    vs
                  </span>
                  <MatchSideCell
                    match={match}
                    side="b"
                    onPick={onPick ? (side) => onPick(match.key, side) : undefined}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Table caption="Round robin standings">
        <thead>
          <Tr>
            <Th>#</Th>
            <Th>Team</Th>
            <Th>Record</Th>
          </Tr>
        </thead>
        <tbody>
          {vm.standings.map((row, i) => (
            <Tr key={row.idx} striped={i % 2 === 1}>
              <Td>{row.rank}</Td>
              <Td>{row.name}</Td>
              <Td>{row.record}</Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
