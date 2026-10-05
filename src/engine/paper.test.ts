import { describe, expect, it } from "vitest";
import {
  PAPER_SIZES,
  getPaperSize,
  mapPointToDestination,
  scaleFactors,
} from "./paper";

describe("paper sizes", () => {
  it("includes A4 at 210 x 297 mm", () => {
    const a4 = getPaperSize("a4");
    expect(a4).toEqual({
      id: "a4",
      name: "A4",
      widthMm: 210,
      heightMm: 297,
    });
  });

  it("throws for an unknown paper id", () => {
    expect(() => getPaperSize("poster")).toThrow(/unknown paper/i);
  });

  it("exposes the built-in catalog", () => {
    expect(PAPER_SIZES.map((size) => size.id)).toEqual([
      "a5",
      "a4",
      "a3",
      "letter",
      "legal",
    ]);
  });
});

describe("scaleFactors", () => {
  const source = getPaperSize("a4");
  const dest = getPaperSize("a5");

  it("fit uses the smaller uniform ratio and keeps origin at 0,0", () => {
    const factors = scaleFactors(source, dest, "fit");
    expect(factors.scaleX).toBeCloseTo(148 / 210);
    expect(factors.scaleY).toBe(factors.scaleX);
    expect(factors.offsetXMm).toBe(0);
    expect(factors.offsetYMm).toBe(0);
  });

  it("fill uses the larger uniform ratio and crops overflow", () => {
    const factors = scaleFactors(source, dest, "fill");
    expect(factors.scaleX).toBeCloseTo(210 / 297);
    expect(factors.scaleY).toBe(factors.scaleX);
  });

  it("stretch maps each axis independently to fill the destination", () => {
    const factors = scaleFactors(source, dest, "stretch");
    expect(factors.scaleX).toBeCloseTo(148 / 210);
    expect(factors.scaleY).toBeCloseTo(210 / 297);
    expect(factors.offsetXMm).toBe(0);
    expect(factors.offsetYMm).toBe(0);
  });
});

describe("mapPointToDestination", () => {
  it("maps origin to origin on identical paper", () => {
    const a4 = getPaperSize("a4");
    expect(mapPointToDestination({ xMm: 0, yMm: 0 }, a4, a4, "fit")).toEqual({
      xMm: 0,
      yMm: 0,
    });
  });

  it("maps the far corner of A4 onto A5 with fit, staying on the page", () => {
    const mapped = mapPointToDestination(
      { xMm: 210, yMm: 297 },
      getPaperSize("a4"),
      getPaperSize("a5"),
      "fit",
    );
    expect(mapped.xMm).toBeCloseTo(148);
    expect(mapped.yMm).toBeLessThanOrEqual(210);
    expect(mapped.yMm).toBeGreaterThan(0);
  });

  it("rejects non-positive paper dimensions", () => {
    expect(() =>
      mapPointToDestination(
        { xMm: 1, yMm: 1 },
        { id: "bad", name: "bad", widthMm: 0, heightMm: 10 },
        getPaperSize("a4"),
        "fit",
      ),
    ).toThrow(/positive/i);
  });
});
