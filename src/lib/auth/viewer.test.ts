import { describe, expect, it } from "vitest";

import {
  accountInitials,
  accountName,
  describeSignInError,
  describeViewerError,
  isAdmin,
  isOwner,
  toViewerRole,
} from "./viewer";
import type { Viewer } from "./viewer";

/* Named rather than read back off `SIGNED_IN_ADMIN`: that fixture is annotated
   `Viewer`, and the union has arms without a `userId` to read. */
const OWNER_ID = "6f1d5f6e-4a1b-4c2e-8f11-0b3c9d2e7a55";

const SIGNED_IN_ADMIN: Viewer = {
  kind: "signed-in",
  userId: OWNER_ID,
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

describe("isOwner", () => {
  it("is true for the admin whose id is on the row", () => {
    expect(isOwner(SIGNED_IN_ADMIN, OWNER_ID)).toBe(true);
  });

  it("refuses an admin who did not create this one", () => {
    // The whole point of the change: being an admin is no longer enough.
    expect(isOwner(SIGNED_IN_ADMIN, "0b3c9d2e-7a55-4c2e-8f11-6f1d5f6e4a1b")).toBe(
      false,
    );
  });

  it("refuses the creator once they have been demoted", () => {
    // The frozen-row model, asserted: the id still matches, the role no longer
    // does, and the update policy tests both — so nobody can change this row.
    expect(isOwner(SIGNED_IN_MEMBER, OWNER_ID)).toBe(false);
  });

  it("refuses a row with no creator", () => {
    // Both meanings of `null` — a row from before the creator-ownership
    // migration, and a session whose row has not loaded yet.
    expect(isOwner(SIGNED_IN_ADMIN, null)).toBe(false);
  });

  it("refuses every viewer that is not a resolved, signed-in account", () => {
    expect(isOwner({ kind: "loading" }, OWNER_ID)).toBe(false);
    expect(isOwner({ kind: "error", message: "network unreachable" }, OWNER_ID)).toBe(
      false,
    );
    expect(isOwner({ kind: "signed-out" }, OWNER_ID)).toBe(false);
    expect(isOwner({ kind: "unconfigured" }, OWNER_ID)).toBe(false);
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

describe("accountName", () => {
  it("uses the email's local-part as the account's name", () => {
    expect(accountName("clubadmin08@example.com")).toBe("clubadmin08");
    expect(accountName("first.last@club.org")).toBe("first.last");
  });

  it("still reads as signed in when there is no email to show", () => {
    // An account whose email claim is absent is signed in all the same, so the
    // name line must not go blank.
    expect(accountName(null)).toBe("Signed in");
    expect(accountName("@gmail.com")).toBe("Signed in");
  });
});

describe("accountInitials", () => {
  it("takes one letter per word when the local-part is separated", () => {
    expect(accountInitials("first.last@x.com")).toBe("FL");
    expect(accountInitials("user+news@x.com")).toBe("UN");
  });

  it("treats every separator in the class as a word boundary", () => {
    // `-` earns its own case: its position in the character class is what
    // decides between a literal and a range. Written as `[.-_+]` the class
    // becomes "`.` through `_`" — digits and capitals swept in, and `-` itself
    // (0x2D, below `.`) dropped — so this pair is what would fail.
    expect(accountInitials("first-last@x.com")).toBe("FL");
    expect(accountInitials("first_last@x.com")).toBe("FL");
  });

  it("falls back to the first two characters when there is no word boundary", () => {
    expect(accountInitials("clubadmin08@example.com")).toBe("CL");
  });

  it("copes with a local-part shorter than two characters", () => {
    expect(accountInitials("a@x.com")).toBe("A");
  });

  it("never renders an empty avatar", () => {
    // A circle with nothing in it reads as a broken image rather than as an
    // account we know nothing about.
    expect(accountInitials(null)).toBe("?");
    expect(accountInitials("@x.com")).toBe("?");
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
