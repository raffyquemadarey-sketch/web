import type { SpinResult, WheelSector, WheelVM } from "./types";

const R = 145;
const HUB_R = 22;
const CX = 150;
const CY = 150;

const SECTOR_COLORS = [
  "var(--color-accent-300)",
  "var(--color-accent-2-300)",
  "var(--color-accent-100)",
  "var(--color-accent-2-100)",
];

const toRad = (deg: number): number => ((deg - 90) * Math.PI) / 180;

export function buildWheelVM(pool: readonly string[]): WheelVM {
  const n = pool.length;
  if (!n) return { sectors: [], hasPlayers: false };

  const sectorAngle = 360 / n;
  const midR = (R + HUB_R) / 2;
  const boxW = Math.min(110, (R - HUB_R) * 0.9);
  const arcLen = (2 * Math.PI * midR) / n;
  const boxH = Math.max(13, Math.min(22, arcLen * 0.85));
  const fontSize = Math.max(8, Math.min(13, boxH * 0.62));
  const maxChars = Math.max(6, Math.floor(boxW / (fontSize * 0.56)));

  const sectors: WheelSector[] = pool.map((name, i) => {
    const startAngle = i * sectorAngle;
    const endAngle = (i + 1) * sectorAngle;
    const x1 = CX + R * Math.cos(toRad(startAngle));
    const y1 = CY + R * Math.sin(toRad(startAngle));
    const x2 = CX + R * Math.cos(toRad(endAngle));
    const y2 = CY + R * Math.sin(toRad(endAngle));
    const largeArc = sectorAngle > 180 ? 1 : 0;
    const path = `M${CX},${CY} L${x1},${y1} A${R},${R} 0 ${largeArc} 1 ${x2},${y2} Z`;
    const labelAngle = startAngle + sectorAngle / 2;
    const labelX = CX + midR * Math.cos(toRad(labelAngle));
    const labelY = CY + midR * Math.sin(toRad(labelAngle));
    const label = name.length > maxChars ? `${name.slice(0, maxChars - 1)}…` : name;
    const rotate = labelAngle > 180 ? labelAngle + 90 : labelAngle - 90;
    return {
      key: `sec-${i}`,
      path,
      color: SECTOR_COLORS[i % SECTOR_COLORS.length],
      label,
      labelX,
      labelY,
      rotate,
      boxX: labelX - boxW / 2,
      boxY: labelY - boxH / 2,
      boxW,
      boxH,
      fontSize,
    };
  });

  return { sectors, hasPlayers: true };
}

/**
 * Picks a player and works out the rotation that parks their sector under the
 * top pointer, after at least five full turns. Returns null for an empty pool.
 */
export function computeSpin(
  pool: readonly string[],
  currentRotation: number,
  targetSlot: number,
  random: () => number = Math.random,
): SpinResult | null {
  const n = pool.length;
  if (!n) return null;
  const chosenIndex = Math.floor(random() * n);
  const chosenName = pool[chosenIndex];
  const sectorAngle = 360 / n;
  const chosenCenter = chosenIndex * sectorAngle + sectorAngle / 2;
  const baseTarget = ((-chosenCenter % 360) + 360) % 360;
  const nextRotation =
    currentRotation +
    5 * 360 +
    ((baseTarget - (currentRotation % 360) + 360) % 360);
  return { chosenIndex, chosenName, targetSlot, nextRotation };
}
