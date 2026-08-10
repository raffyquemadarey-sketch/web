import { describe, expect, it } from "vitest";

import { shuffleFisherYates } from "./shuffle";

describe("shuffleFisherYates", () => {
  it("returns a permutation without touching the input", () => {
    const input = ["a", "b", "c", "d", "e"];
    const snapshot = [...input];
    const out = shuffleFisherYates(input);

    expect(input).toEqual(snapshot);
    expect(out).not.toBe(input);
    expect([...out].sort()).toEqual([...input].sort());
  });

  it("is deterministic under a stubbed random source", () => {
    const input = ["a", "b", "c", "d"];
    const first = shuffleFisherYates(input, () => 0);
    const second = shuffleFisherYates(input, () => 0);

    expect(first).toEqual(second);
    // random() === 0 always swaps the current tail with index 0.
    expect(first).toEqual(["b", "c", "d", "a"]);
  });

  it("handles empty and single-element inputs", () => {
    expect(shuffleFisherYates([])).toEqual([]);
    expect(shuffleFisherYates(["only"])).toEqual(["only"]);
  });
});
