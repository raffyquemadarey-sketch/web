"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Button, ButtonLink } from "@/components/ui/button";
import { useDemoSession } from "@/lib/demo/demo-session-provider";

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
      <Link href="/tournaments" aria-current={currentFor(pathname, "/tournaments")}>
        Tournaments
      </Link>
      <Link href="/quick-play" aria-current={currentFor(pathname, "/quick-play")}>
        Quick Play
      </Link>
      <Link href="/admin" aria-current={currentFor(pathname, "/admin")}>
        Admin
      </Link>
      {signedIn ? (
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
          <ButtonLink href="/signin" variant="ghost" style={{ whiteSpace: "nowrap" }}>
            Sign in
          </ButtonLink>
          <ButtonLink
            href="/register"
            variant="primary"
            style={{ whiteSpace: "nowrap" }}
          >
            Register
          </ButtonLink>
        </>
      )}
    </nav>
  );
}
