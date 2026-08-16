import { describe, expect, it } from "vitest";

import { googleMapsSearchUrl } from "./maps";

describe("googleMapsSearchUrl", () => {
  it("builds a search url for a venue name", () => {
    expect(googleMapsSearchUrl("Riverside Sports Centre")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Riverside%20Sports%20Centre",
    );
  });

  it("builds a search url for a bare place name", () => {
    expect(googleMapsSearchUrl("Taguig")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Taguig",
    );
  });

  it("percent-encodes characters that would break the query string", () => {
    expect(googleMapsSearchUrl("Smith & Sons Hall #2, Taguig")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Smith%20%26%20Sons%20Hall%20%232%2C%20Taguig",
    );
  });

  it("trims before encoding, so no stray %20 lands in the query", () => {
    expect(googleMapsSearchUrl("  Taguig  ")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Taguig",
    );
  });

  it("has no link to offer without a location", () => {
    expect(googleMapsSearchUrl("")).toBeNull();
    expect(googleMapsSearchUrl("   ")).toBeNull();
  });
});
