import { describe, expect, it } from "vitest";

import {
  describeSignInError,
  describeViewerError,
  isAdmin,
  toViewerRole,
} from "./viewer";
import type { Viewer } from "./viewer";

const SIGNED_IN_ADMIN: Viewer = {
  kind: "signed-in",
  userId: "6f1d5f6e-4a1b-4c2e-8f11-0b3c9d2e7a55",
  email: "admin@example.com",
  role: "admin",
};

const SIGNED_IN_MEMBER: Viewer = {
  ...SIGNED_IN_ADMIN,
  email: "member@example.com",
  role: "member",
};

describe("isAdmin", () => {
  it("is true only for a resolved, signed-in admin", () => {
    expect(isAdmin(SIGNED_IN_ADMIN)).toBe(true);
  });

  it("refuses a signed-in member", () => {
    expect(isAdmin(SIGNED_IN_MEMBER)).toBe(false);
  });

  it("refuses every viewer that is not signed in", () => {
    expect(isAdmin({ kind: "signed-out" })).toBe(false);
    expect(isAdmin({ kind: "unconfigured" })).toBe(false);
  });

  it("defaults to read-only while unresolved or broken", () => {
    // The load-bearing half: a control that rendered during `loading`, or after
    // the role read failed, would offer an edit the database is going to refuse.
    expect(isAdmin({ kind: "loading" })).toBe(false);
    expect(isAdmin({ kind: "error", message: "network unreachable" })).toBe(false);
  });
});

describe("describeViewerError", () => {
  it("says the check failed rather than claiming the viewer isn't an admin", () => {
    const message = describeViewerError("Failed to fetch");

    // The half that matters: an admin whose role read dropped must not be told
    // they lack access, because they don't, and there is nothing they could do
    // about it if they did.
    expect(message).toContain("couldn't check your account");
    expect(message).not.toContain("admin");
  });

  it("carries the underlying reason and an action", () => {
    const message = describeViewerError("Failed to fetch");

    expect(message).toContain("Failed to fetch");
    expect(message).toContain("reload");
  });
});

describe("toViewerRole", () => {
  it("recognises the one role that can write", () => {
    expect(toViewerRole("admin")).toBe("admin");
  });

  it("treats everything else as a member", () => {
    expect(toViewerRole("member")).toBe("member");
    expect(toViewerRole("")).toBe("member");
    expect(toViewerRole("Admin")).toBe("member");
    expect(toViewerRole("superadmin")).toBe("member");
    // A missing `profiles` row — an account created before the trigger existed.
    expect(toViewerRole(null)).toBe("member");
    expect(toViewerRole(undefined)).toBe("member");
  });
});

describe("describeSignInError", () => {
  it("explains a wrong password without confirming the email exists", () => {
    expect(describeSignInError("invalid_credentials", "Invalid login credentials")).toBe(
      "That email and password don't match an account.",
    );
  });

  it("names the dashboard checkbox for an unconfirmed account", () => {
    expect(describeSignInError("email_not_confirmed", "Email not confirmed")).toContain(
      "Auto Confirm User",
    );
  });

  it("tells a rate-limited attempt to wait", () => {
    expect(describeSignInError("over_request_rate_limit", "too many requests")).toBe(
      "Too many attempts — wait a minute and try again.",
    );
  });

  it("falls back to the raw message, so a new code is never an empty alert", () => {
    expect(describeSignInError("provider_disabled", "Email logins are disabled")).toBe(
      "Not signed in — Email logins are disabled.",
    );
    expect(describeSignInError(undefined, "Failed to fetch")).toBe(
      "Not signed in — Failed to fetch.",
    );
  });
});
