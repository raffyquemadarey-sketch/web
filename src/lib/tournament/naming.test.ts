import { describe, expect, it } from "vitest";

import { suggestTournamentName } from "./naming";

describe("suggestTournamentName", () => {
  it("joins location and dates with an em dash", () => {
    expect(
      suggestTournamentName({ location: "Taguig", dates: "September 20, 2026" }),
    ).toBe("Taguig — September 20, 2026");
  });

  it("joins a venue with a multi-day range", () => {
    expect(
      suggestTournamentName({
        location: "Riverside Sports Centre",
        dates: "Sept 12–14",
      }),
    ).toBe("Riverside Sports Centre — Sept 12–14");
  });

  it("uses the location alone when there are no dates yet", () => {
    expect(suggestTournamentName({ location: "Taguig", dates: "" })).toBe("Taguig");
  });

  it("uses the dates alone when there is no location yet", () => {
    expect(suggestTournamentName({ location: "", dates: "Sept 12–14" })).toBe(
      "Sept 12–14",
    );
  });

  it("suggests nothing for an untouched form", () => {
    expect(suggestTournamentName({ location: "", dates: "" })).toBe("");
  });

  it("treats whitespace-only fields as empty", () => {
    expect(suggestTournamentName({ location: "   ", dates: " " })).toBe("");
  });

  it("skips a whitespace-only location rather than joining it", () => {
    expect(suggestTournamentName({ location: "  ", dates: "Sept 12–14" })).toBe(
      "Sept 12–14",
    );
  });

  it("trims both fields so the join has exactly one space either side", () => {
    expect(
      suggestTournamentName({ location: "  Taguig  ", dates: "  Sept 12–14 " }),
    ).toBe("Taguig — Sept 12–14");
  });

  it("falls back to the location when the joined name would exceed the schema max", () => {
    const location = "R".repeat(70);
    const suggestion = suggestTournamentName({ location, dates: "Sept 12–14" });
    expect(suggestion).toBe(location);
    expect(suggestion.length).toBeLessThanOrEqual(80);
  });

  it("falls back to the dates when the location alone is too long", () => {
    expect(
      suggestTournamentName({ location: "R".repeat(90), dates: "Sept 12–14" }),
    ).toBe("Sept 12–14");
  });
});
