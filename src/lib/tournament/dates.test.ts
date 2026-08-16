import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { formatTournamentDates, isValidIsoDate } from "./dates";

describe("isValidIsoDate", () => {
  it("accepts a real calendar day", () => {
    expect(isValidIsoDate("2026-09-20")).toBe(true);
  });

  it("accepts Feb 29 in a leap year and rejects it otherwise", () => {
    expect(isValidIsoDate("2024-02-29")).toBe(true);
    expect(isValidIsoDate("2026-02-29")).toBe(false);
    expect(isValidIsoDate("2100-02-29")).toBe(false);
    expect(isValidIsoDate("2000-02-29")).toBe(true);
  });

  it("rejects days past the end of the month", () => {
    expect(isValidIsoDate("2026-02-30")).toBe(false);
    expect(isValidIsoDate("2026-04-31")).toBe(false);
    expect(isValidIsoDate("2026-01-32")).toBe(false);
    expect(isValidIsoDate("2026-01-00")).toBe(false);
  });

  it("rejects an out-of-range month", () => {
    expect(isValidIsoDate("2026-13-01")).toBe(false);
    expect(isValidIsoDate("2026-00-01")).toBe(false);
  });

  it("rejects anything that is not YYYY-MM-DD", () => {
    expect(isValidIsoDate("20260920")).toBe(false);
    expect(isValidIsoDate("2026-9-20")).toBe(false);
    expect(isValidIsoDate("09/20/2026")).toBe(false);
    expect(isValidIsoDate("")).toBe(false);
  });
});

describe("formatTournamentDates", () => {
  it("writes a one-day event in long form, with the year", () => {
    expect(formatTournamentDates("2026-09-20", null)).toBe("September 20, 2026");
  });

  it("treats an end date equal to the start as a one-day event", () => {
    expect(formatTournamentDates("2026-09-20", "2026-09-20")).toBe(
      "September 20, 2026",
    );
  });

  it("collapses a range inside one month to a bare day span", () => {
    expect(formatTournamentDates("2026-09-12", "2026-09-14")).toBe("Sept 12–14");
  });

  it("spells both months when a range crosses one", () => {
    expect(formatTournamentDates("2026-09-30", "2026-10-02")).toBe(
      "Sept 30 – Oct 2",
    );
  });

  it("adds both years when a range crosses one", () => {
    expect(formatTournamentDates("2026-12-30", "2027-01-02")).toBe(
      "Dec 30, 2026 – Jan 2, 2027",
    );
  });

  it("strips the leading zeros off the days", () => {
    expect(formatTournamentDates("2026-10-03", "2026-10-05")).toBe("Oct 3–5");
    expect(formatTournamentDates("2026-01-01", null)).toBe("January 1, 2026");
  });

  it("falls back to an unusable end date's one-day form", () => {
    expect(formatTournamentDates("2026-09-20", "")).toBe("September 20, 2026");
    expect(formatTournamentDates("2026-09-20", "not-a-date")).toBe(
      "September 20, 2026",
    );
  });

  it("renders nothing for a missing or malformed start date", () => {
    expect(formatTournamentDates("", null)).toBe("");
    expect(formatTournamentDates("not-a-date", null)).toBe("");
    expect(formatTournamentDates("2026-02-30", "2026-03-02")).toBe("");
  });
});

describe("formatTournamentDates across timezones", () => {
  let previousTz: string | undefined;

  beforeAll(() => {
    previousTz = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";
  });

  afterAll(() => {
    process.env.TZ = previousTz;
  });

  it("formats the calendar date the user picked, not a UTC-shifted one", () => {
    /* Guard: proves this environment actually exhibits the hazard. If Node ever
       stops honouring a runtime TZ change, this line fails loudly rather than
       letting the real assertion pass for the wrong reason. */
    expect(new Date("2026-09-20").getDate()).toBe(19);
    expect(formatTournamentDates("2026-09-20", null)).toBe("September 20, 2026");
    expect(formatTournamentDates("2026-01-01", null)).toBe("January 1, 2026");
  });
});
