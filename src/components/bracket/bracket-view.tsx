import type { BracketVM } from "@/lib/tournament/types";
import type { MatchSide } from "@/lib/validation/enums";

import { EliminationBracket } from "./elimination-bracket";
import { RoundRobinBracket } from "./round-robin-bracket";

/** Single entry point for both the public detail page and the admin manage page. */
export function BracketView({
  vm,
  onPick,
}: {
  vm: BracketVM;
  onPick?: (key: string, side: MatchSide) => void;
}) {
  return vm.kind === "elimination" ? (
    <EliminationBracket vm={vm} onPick={onPick} />
  ) : (
    <RoundRobinBracket vm={vm} onPick={onPick} />
  );
}
