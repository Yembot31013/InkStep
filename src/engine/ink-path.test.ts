import { describe, expect, it } from "vitest";
import { appendInkPoint, densifySegment, keepInkSample } from "./ink-path";

describe("keepInkSample", () => {
  it("keeps the first point of a stroke", () => {
    expect(keepInkSample(undefined, { xMm: 1, yMm: 1 }, 0.2)).toBe(true);
  });

  it("drops jitter smaller than the sample spacing", () => {
    expect(
      keepInkSample({ xMm: 0, yMm: 0 }, { xMm: 0.05, yMm: 0 }, 0.2),
    ).toBe(false);
  });

  it("keeps movement that exceeds the sample spacing", () => {
    expect(
      keepInkSample({ xMm: 0, yMm: 0 }, { xMm: 0.4, yMm: 0 }, 0.2),
    ).toBe(true);
  });
});

describe("densifySegment", () => {
  it("fills a fast jump with intermediate points so a curve does not collapse to a zigzag", () => {
    const points = densifySegment(
      { xMm: 0, yMm: 0 },
      { xMm: 1, yMm: 0 },
      0.25,
    );
    expect(points.at(-1)).toEqual({ xMm: 1, yMm: 0 });
    expect(points.length).toBeGreaterThan(2);
    const firstGap = (points[0]?.xMm ?? 0) - 0;
    const secondGap = (points[1]?.xMm ?? 0) - (points[0]?.xMm ?? 0);
    expect(Math.max(firstGap, secondGap)).toBeLessThanOrEqual(0.25 + 1e-9);
  });

  it("does not insert points when the jump is already short", () => {
    expect(
      densifySegment({ xMm: 0, yMm: 0 }, { xMm: 0.1, yMm: 0 }, 0.25),
    ).toEqual([{ xMm: 0.1, yMm: 0 }]);
  });
});

describe("appendInkPoint", () => {
  it("grows a stroke with densified samples", () => {
    const next = appendInkPoint([{ xMm: 0, yMm: 0 }], { xMm: 1, yMm: 0 }, 0.08, 0.25);
    expect(next[0]).toEqual({ xMm: 0, yMm: 0 });
    expect(next.at(-1)).toEqual({ xMm: 1, yMm: 0 });
    expect(next.length).toBeGreaterThan(3);
  });
});
