"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { AccountMenu } from "@/components/layout/account-menu";
import { Button, ButtonLink } from "@/components/ui/button";
import { isAdmin } from "@/lib/auth/viewer";
import { useViewer } from "@/lib/auth/viewer-provider";
import { useDemoSession } from "@/lib/demo/demo-session-provider";
import { createClient } from "@/lib/supabase/client";

type NavLink = { href: string; label: string; hidden?: boolean };

/* Tournaments and Admin are still being built, so the nav doesn't advertise
   them yet. Both routes stay reachable by URL and nothing is gated — this is a
   label decision, not an access one, exactly like `/dashboard`. Kept as flagged
   entries rather than deleted so bringing one back is a one-word edit and the
   intended order survives: set its `hidden` to false.

   Adding one costs more than it looks: the account menu's panel is anchored
   with `right: 0` on the avatar, which only stays on screen while the avatar is
   the last item in this nav and sits at its right edge. This nav wraps at
   narrow widths, so a link long enough to push the avatar onto a second,
   left-aligned row would hang the panel's left edge off the viewport. See the
   note on `.panel` in `account-menu.module.css`. */
const NAV_LINKS: readonly NavLink[] = [
  { href: "/tournaments", label: "Tournaments", hidden: true },
  { href: "/quick-play", label: "Quick Play" },
  { href: "/admin", label: "Admin", hidden: true },
];

/* Register is hidden for the same reason as the nav links above, plus one of
   its own: the account it mints is simulated, and `/signin` — the only real
   sign-in — cannot accept it, so a primary button offering an account leads
   somewhere that can't deliver one. A label decision, not an access one:
   `/register` is untouched and still works by URL. Flip this to true to put the
   button back; Sign in drops to ghost beside it, as it was. The `: boolean` is
   deliberate — without it TS narrows to `false` and calls the other branch
   unreachable. */
const SHOW_REGISTER_CTA: boolean = false;

function currentFor(pathname: string, section: string): "page" | undefined {
  if (section === "/") return pathname === "/" ? "page" : undefined;
  return pathname === section || pathname.startsWith(`${section}/`)
    ? "page"
    : undefined;
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, signOutDemo } = useDemoSession();
  const viewer = useViewer();

  /* One account cluster, and a real session wins it: an admin who also
     registered a demo account sees Sign out rather than two ways to end a
     session. `/dashboard` stays reachable by URL, which is all the demo flow
     needs. */
  const realSignedIn = viewer.kind === "signed-in";
  const signedIn = session.status === "demo-signed-in";

  return (
    <nav
      className="nav"
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        width: "100%",
        padding: "var(--space-3) clamp(20px, 5vw, 72px)",
        boxSizing: "border-box",
        flexWrap: "wrap",
        rowGap: "10px",
      }}
    >
      <Link
        href="/"
        className="nav-brand"
        aria-current={currentFor(pathname, "/")}
        style={{ textDecoration: "none" }}
      >
        RallyPoint
      </Link>
      {NAV_LINKS.filter((link) => !link.hidden).map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={currentFor(pathname, link.href)}
        >
          {link.label}
        </Link>
      ))}
      {realSignedIn ? (
        /* The email lives in the menu's panel, which is fixed-width — the one
           place a label that can be arbitrarily long doesn't threaten a nav that
           wraps at 375px. Signing out for real also ends the demo session, so
           one control ends everything this browser holds and there is never a
           second "Log out" to hunt for. */
        <AccountMenu
          email={viewer.email}
          admin={isAdmin(viewer)}
          onSignOut={() => {
            void (async () => {
              await createClient().auth.signOut();
              signOutDemo();
              router.push("/");
            })();
          }}
        />
      ) : signedIn ? (
        <>
          <Link href="/dashboard" aria-current={currentFor(pathname, "/dashboard")}>
            Dashboard
          </Link>
          <Button
            variant="ghost"
            style={{ whiteSpace: "nowrap" }}
            onClick={() => {
              signOutDemo();
              router.push("/");
            }}
          >
            Log out
          </Button>
        </>
      ) : (
        <>
          <ButtonLink
            href="/signin"
            variant={SHOW_REGISTER_CTA ? "ghost" : "primary"}
            style={{ whiteSpace: "nowrap" }}
          >
            Sign in
          </ButtonLink>
          {SHOW_REGISTER_CTA ? (
            <ButtonLink
              href="/register"
              variant="primary"
              style={{ whiteSpace: "nowrap" }}
            >
              Register
            </ButtonLink>
          ) : null}
        </>
      )}
    </nav>
  );
}
