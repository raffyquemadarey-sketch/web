import { describe, expect, it } from "vitest";

import { parseCsvRows } from "./csv";

describe("parseCsvRows", () => {
  it("splits plain rows and cells", () => {
    expect(parseCsvRows("Name,Team\nAna,Red\nBen,Blue")).toEqual([
      ["Name", "Team"],
      ["Ana", "Red"],
      ["Ben", "Blue"],
    ]);
  });

  it("keeps a comma inside a quoted field", () => {
    expect(parseCsvRows('"Lee, Jordan",Red')).toEqual([["Lee, Jordan", "Red"]]);
  });

  it("keeps a newline inside a quoted field", () => {
    expect(parseCsvRows('"Ana\nMarie",Red\nBen,Blue')).toEqual([
      ["Ana\nMarie", "Red"],
      ["Ben", "Blue"],
    ]);
  });

  it("unescapes a doubled quote", () => {
    expect(parseCsvRows('"Ana ""Smash"" Lee"')).toEqual([['Ana "Smash" Lee']]);
  });

  it("handles CRLF line endings", () => {
    expect(parseCsvRows("Ana,Red\r\nBen,Blue\r\n")).toEqual([
      ["Ana", "Red"],
      ["Ben", "Blue"],
    ]);
  });

  it("strips a leading UTF-8 BOM", () => {
    expect(parseCsvRows("﻿Name\nAna")).toEqual([["Name"], ["Ana"]]);
  });

  it("does not invent a row for a trailing newline", () => {
    expect(parseCsvRows("Ana\nBen\n")).toEqual([["Ana"], ["Ben"]]);
  });

  it("keeps empty cells", () => {
    expect(parseCsvRows("Ana,,Red\n,Ben")).toEqual([["Ana", "", "Red"], ["", "Ben"]]);
  });

  it("returns nothing for empty input", () => {
    expect(parseCsvRows("")).toEqual([]);
    expect(parseCsvRows("﻿")).toEqual([]);
  });
});
