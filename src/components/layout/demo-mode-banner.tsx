import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Always visible, on every route. Most of the app is auth-shaped UI over
 * in-memory data, so it says so plainly rather than implying anything here is
 * protected.
 *
 * It branches because "no backend is connected" stopped being true once
 * Quick Play started saving: with credentials configured, exactly one thing on
 * the site reaches a database — the quick plays — and `/signin` is real auth
 * against that same project, so the banner has to name both or it is lying on
 * every route. Without credentials neither is true and the original wording
 * still holds byte-for-byte. Reading the env here is a plain module read of
 * values Next inlined at build time — no request, so the layout stays cacheable.
 */
export function DemoModeBanner() {
  const configured = getSupabaseEnv() !== null;

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
      {configured ? (
        <>
          <strong>Demo mode</strong> — tournaments and registrations live in
          memory and reset when you reload, and signing up creates a simulated
          account that grants no access. Quick Play is the exception, and
          it&apos;s real: its sessions are stored in Supabase, anyone can read
          them, and only the club admin who created one can change it.
        </>
      ) : (
        <>
          <strong>Demo mode</strong> — no backend is connected. Sign-in is
          simulated, grants no access, and all changes live in memory and reset
          when you reload.
        </>
      )}
    </div>
  );
}
