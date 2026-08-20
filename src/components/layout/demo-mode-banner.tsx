import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Always visible, on every route. The app has auth-shaped UI but no real
 * sign-in, so it says so plainly rather than implying anything here is
 * protected.
 *
 * It branches because "no backend is connected" stopped being true once
 * Quick Play started saving: with credentials configured, exactly one thing on
 * the site reaches a database — the quick plays you save — and the banner has to
 * name it or it is lying on every route. Without credentials nothing does, and
 * the original wording still holds byte-for-byte. Reading the env here is a
 * plain module read of values Next inlined at build time — no request, so the
 * layout stays cacheable.
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
          <strong>Demo mode</strong> — sign-in is simulated and grants no access,
          and tournaments and registrations live in memory and reset when you
          reload. Quick Play is the exception: the quick plays you create there
          are saved to private rows in Supabase that only this browser can read.
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
