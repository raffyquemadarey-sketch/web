import type { Tournament } from "@/lib/data/types";

import { buildEliminationVM } from "./elimination";
import { buildRoundRobinVM } from "./round-robin";
import type { BracketVM } from "./types";

export function buildBracketVM(t: Tournament): BracketVM {
  return t.format === "roundrobin" ? buildRoundRobinVM(t) : buildEliminationVM(t);
}
