import type { Tournament } from "@/lib/data/types";
import type { MatchSide } from "@/lib/validation/enums";

import type {
  BracketTeam,
  RoundRobinMatchVM,
  RoundRobinVM,
  StandingRow,
} from "./types";

export function buildRoundRobinVM(t: Tournament): RoundRobinVM {
  const decisions = t.decisions;
  const courtCount = t.courtCount || 4;
  let courtSeq = 0;

  let arr: (BracketTeam | null)[] = t.teams.map((name, idx) => ({ idx, name }));
  if (arr.length % 2 !== 0) arr.push(null);
  const n = arr.length;
  const totalRounds = n > 1 ? n - 1 : 0;
  const scheduleRounds: { label: string; matches: RoundRobinMatchVM[] }[] = [];
  const allMatches: RoundRobinMatchVM[] = [];

  for (let r = 0; r < totalRounds; r++) {
    const roundMatches: RoundRobinMatchVM[] = [];
    for (let i = 0; i < n / 2; i++) {
      const p1 = arr[i];
      const p2 = arr[n - 1 - i];
      if (p1 && p2) {
        // Canonical key: side `a` is always the lower team index, so a stored
        // decision stays valid however the rotation orders the pairing.
        const a = p1.idx < p2.idx ? p1 : p2;
        const b = a === p1 ? p2 : p1;
        const key = `rr-${a.idx}-${b.idx}`;
        const decision = decisions[key];
        const winner: MatchSide | null =
          decision === "a" ? "a" : decision === "b" ? "b" : null;
        const court = (courtSeq % courtCount) + 1;
        courtSeq++;
        const match: RoundRobinMatchVM = {
          key,
          a,
          b,
          aName: a.name,
          bName: b.name,
          winner,
          court,
          courtLabel: `Court ${court}`,
        };
        roundMatches.push(match);
        allMatches.push(match);
      }
    }
    scheduleRounds.push({ label: `Round ${r + 1}`, matches: roundMatches });
    const fixed = arr[0];
    const rest = arr.slice(1);
    const last = rest.pop();
    if (last !== undefined) rest.unshift(last);
    arr = [fixed, ...rest];
  }

  const tally = t.teams.map((name, idx) => ({ name, idx, wins: 0, losses: 0 }));
  for (const m of allMatches) {
    if (m.winner === null) continue;
    const winnerIdx = m.winner === "a" ? m.a.idx : m.b.idx;
    const loserIdx = m.winner === "a" ? m.b.idx : m.a.idx;
    tally[winnerIdx].wins++;
    tally[loserIdx].losses++;
  }
  tally.sort(
    (a, b) => b.wins - a.wins || a.losses - b.losses || a.name.localeCompare(b.name),
  );
  const standings: StandingRow[] = tally.map((row, i) => ({
    ...row,
    rank: i + 1,
    record: `${row.wins}–${row.losses}`,
  }));

  return { kind: "roundRobin", scheduleRounds, matches: allMatches, standings };
}
