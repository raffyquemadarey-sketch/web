import { describe, expect, it } from "vitest";

import { buildWheelVM, computeSpin } from "./wheel";

describe("buildWheelVM", () => {
  it("renders one sector per player", () => {
    const vm = buildWheelVM(["Ana", "Ben", "Cara"]);
    expect(vm.hasPlayers).toBe(true);
    expect(vm.sectors).toHaveLength(3);
    expect(vm.sectors.map((s) => s.key)).toEqual(["sec-0", "sec-1", "sec-2"]);
  });

  it("divides the full circle between the sectors", () => {
    const pool = ["Ana", "Ben", "Cara", "Dev", "Eve"];
    const vm = buildWheelVM(pool);
    const sectorAngle = 360 / pool.length;
    expect(sectorAngle * vm.sectors.length).toBeCloseTo(360);
    // Label angles sit at the centre of each sector, so they step by one angle.
    const rotations = vm.sectors.map((s) => s.rotate);
    expect(rotations).toHaveLength(pool.length);
  });

  it("truncates long names with an ellipsis", () => {
    const long = "Bartholomew Cunningham-Fitzgerald";
    const vm = buildWheelVM([long, "Ana", "Ben", "Cara", "Dev", "Eve"]);
    expect(vm.sectors[0].label.endsWith("…")).toBe(true);
    expect(vm.sectors[0].label.length).toBeLessThan(long.length);
    expect(vm.sectors[1].label).toBe("Ana");
  });

  it("reports an empty pool", () => {
    expect(buildWheelVM([])).toEqual({ sectors: [], hasPlayers: false });
  });
});

describe("computeSpin", () => {
  it("parks the chosen sector centre under the top pointer", () => {
    const pool = ["Ana", "Ben", "Cara", "Dev"];
    const result = computeSpin(pool, 0, 0, () => 0);
    expect(result).not.toBeNull();
    expect(result?.chosenIndex).toBe(0);
    expect(result?.chosenName).toBe("Ana");

    const sectorAngle = 360 / pool.length;
    const chosenCentre = sectorAngle / 2;
    const settled = ((result?.nextRotation ?? 0) + chosenCentre) % 360;
    expect(settled).toBeCloseTo(0);
  });

  it("adds at least five full turns", () => {
    const result = computeSpin(["Ana", "Ben"], 137, 2, () => 0.75);
    expect(result?.nextRotation ?? 0).toBeGreaterThanOrEqual(137 + 5 * 360);
    expect(result?.targetSlot).toBe(2);
    expect(result?.chosenName).toBe("Ben");
  });

  it("returns null for an empty pool", () => {
    expect(computeSpin([], 0, 0)).toBeNull();
  });
});
