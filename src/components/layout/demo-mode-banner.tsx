/**
 * Always visible, on every route. The app has auth-shaped UI but no backend, so
 * it says so plainly rather than implying anything here is protected.
 */
export function DemoModeBanner() {
  return (
    <div
      role="note"
      style={{
        background: "var(--color-accent-2-200)",
        color: "var(--color-accent-2-900)",
        borderBottom: "1px solid var(--color-divider)",
        fontSize: "12.5px",
        lineHeight: 1.5,
        padding: "8px clamp(20px, 5vw, 72px)",
        textAlign: "center",
      }}
    >
      <strong>Demo mode</strong> — no backend is connected. Sign-in is simulated,
      grants no access, and all changes live in memory and reset when you reload.
    </div>
  );
}
