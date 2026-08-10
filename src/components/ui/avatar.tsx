import { initialsOf } from "@/lib/tournament/labels";

export function InitialsAvatar({ name, size }: { name: string; size: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        background: "var(--color-accent-100)",
        color: "var(--color-accent-700)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-heading)",
        fontWeight: 400,
        fontSize: `${Math.round(size * 0.37)}px`,
        flex: "none",
      }}
    >
      {initialsOf(name)}
    </div>
  );
}

/**
 * Stands in for the design's upload slot. There is no backend to upload to, so
 * this is a static, decorative circle rather than a control that cannot work.
 */
export function PhotoPlaceholder({
  size,
  label = "Photo",
}: {
  size: number;
  label?: string;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        background: "var(--color-accent-2-100)",
        color: "color-mix(in srgb, var(--color-text) 50%, transparent)",
        border: "1px solid var(--color-divider)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: `${Math.max(10, Math.round(size * 0.2))}px`,
        flex: "none",
      }}
    >
      {label}
    </div>
  );
}
