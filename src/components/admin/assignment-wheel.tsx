"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { buildWheelVM, computeSpin } from "@/lib/tournament/wheel";

const SPIN_MS = 3000;
const REDUCED_MOTION_MS = 300;

export function AssignmentWheel({
  pool,
  targetSlot,
  onResult,
  onReset,
}: {
  pool: string[];
  /** Index of the first team slot with spare capacity, or -1 when the draw is full. */
  targetSlot: number;
  onResult: (name: string) => void;
  onReset: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const vm = buildWheelVM(pool);

  if (!vm.hasPlayers || targetSlot === -1) {
    return (
      <p style={{ fontSize: "13.5px", opacity: 0.6, margin: 0 }}>
        Everyone registered is already on a team.
      </p>
    );
  }

  const spin = () => {
    if (spinning) return;
    const result = computeSpin(pool, rotation, targetSlot);
    if (!result) return;
    setSpinning(true);
    setLastResult(null);
    // Under reduced motion the wheel keeps its orientation: dropping only the
    // transition would still snap the transform to the final angle, which is
    // the jump the preference asks us not to make. The pick still resolves and
    // is still announced below.
    if (!reducedMotion) setRotation(result.nextRotation);
    timerRef.current = setTimeout(
      () => {
        onResult(result.chosenName);
        setLastResult(result.chosenName);
        setSpinning(false);
      },
      reducedMotion ? REDUCED_MOTION_MS : SPIN_MS,
    );
  };

  return (
    <>
      <div style={{ position: "relative", width: "260px", height: "260px" }}>
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "-2px",
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "14px solid transparent",
            borderRight: "14px solid transparent",
            borderTop: "24px solid var(--color-accent-700)",
            filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.25))",
            zIndex: 3,
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            boxShadow: "var(--shadow-lg)",
            background: "var(--color-surface)",
          }}
        />
        <svg
          role="img"
          aria-label="Player selection wheel"
          viewBox="0 0 300 300"
          style={{
            position: "relative",
            width: "260px",
            height: "260px",
            borderRadius: "50%",
            transform: `rotate(${rotation}deg)`,
            transition: reducedMotion
              ? "none"
              : "transform 3s cubic-bezier(0.17,0.67,0.12,0.99)",
            zIndex: 1,
          }}
        >
          <circle
            cx="150"
            cy="150"
            r="147"
            fill="none"
            stroke="var(--color-surface)"
            strokeWidth="6"
          />
          {vm.sectors.map((sector) => (
            <g key={sector.key}>
              <path
                d={sector.path}
                fill={sector.color}
                stroke="var(--color-surface)"
                strokeWidth="3"
              />
              <foreignObject
                x={sector.boxX}
                y={sector.boxY}
                width={sector.boxW}
                height={sector.boxH}
                transform={`rotate(${sector.rotate} ${sector.labelX} ${sector.labelY})`}
              >
                <div
                  style={{
                    fontSize: `${sector.fontSize}px`,
                    fontWeight: 700,
                    fontFamily: "var(--font-body)",
                    color: "#201e1d",
                    textAlign: "center",
                    lineHeight: 1.2,
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                  }}
                >
                  {sector.label}
                </div>
              </foreignObject>
            </g>
          ))}
          <circle cx="150" cy="150" r="22" fill="var(--color-accent-700)" />
          <circle
            cx="150"
            cy="150"
            r="22"
            fill="none"
            stroke="var(--color-surface)"
            strokeWidth="4"
          />
        </svg>
      </div>

      <VisuallyHidden>
        <ul>
          {pool.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </VisuallyHidden>

      <Button
        variant="primary"
        disabled={spinning}
        onClick={spin}
        style={{ whiteSpace: "nowrap", paddingInline: "22px" }}
      >
        {spinning ? "Spinning…" : "Spin the wheel"}
      </Button>

      <p aria-live="polite" style={{ fontSize: "14px", margin: 0 }}>
        {lastResult ? <>🎉 <strong>{lastResult}</strong> joins the bracket!</> : null}
      </p>

      <Button variant="ghost" onClick={onReset}>
        Reset all assignments
      </Button>
    </>
  );
}
