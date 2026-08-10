"use client";

/**
 * Simulated sign-in for the demo build.
 *
 * This grants no access to anything. There is no server, no token, no cookie and
 * no storage — signing in only swaps some labels in the UI, and every route stays
 * publicly reachable. Real authentication arrives with the backend; until then the
 * demo-mode banner says so on every page. Nothing here should be treated as, or
 * grow into, an access-control mechanism.
 */

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

import type { AccountRole, SkillLevel } from "@/lib/validation/enums";

export type DemoProfile = {
  name: string;
  email: string;
  role: AccountRole;
  skill: SkillLevel | null;
};

/** A confirmed demo entry: which tournament, and the division chosen for it.
 *  `division` is null for coach and club-admin entries, which enter as a squad
 *  rather than into a singles division. */
export type DemoEntry = {
  tournamentId: string;
  division: SkillLevel | null;
};

export type DemoSession =
  | { status: "signed-out" }
  | {
      status: "demo-signed-in";
      profile: DemoProfile;
      entry: DemoEntry | null;
      isNewAccount: boolean;
    };

type DemoSessionValue = {
  session: DemoSession;
  signInDemo: (profile: DemoProfile, opts?: { isNewAccount?: boolean }) => void;
  signOutDemo: () => void;
  setEntry: (entry: DemoEntry | null) => void;
};

const DemoSessionContext = createContext<DemoSessionValue | null>(null);

export function DemoSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<DemoSession>({ status: "signed-out" });

  const value: DemoSessionValue = {
    session,
    signInDemo: (profile, opts) =>
      setSession({
        status: "demo-signed-in",
        profile,
        entry: null,
        isNewAccount: opts?.isNewAccount ?? false,
      }),
    signOutDemo: () => setSession({ status: "signed-out" }),
    setEntry: (entry) =>
      setSession((prev) =>
        prev.status === "demo-signed-in" ? { ...prev, entry } : prev,
      ),
  };

  return (
    <DemoSessionContext.Provider value={value}>
      {children}
    </DemoSessionContext.Provider>
  );
}

export function useDemoSession(): DemoSessionValue {
  const value = useContext(DemoSessionContext);
  if (!value) {
    throw new Error("useDemoSession must be used inside <DemoSessionProvider>.");
  }
  return value;
}
