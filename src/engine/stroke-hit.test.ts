import { describe, expect, it } from "vitest";
import { distanceToStroke, nearestStroke } from "./stroke-hit";

describe("distanceToStroke", () => {
  it("measures distance to a segment, not only vertices", () => {
    const stroke = {
      id: "line",
      points: [
        { xMm: 0, yMm: 0 },
        { xMm: 10, yMm: 0 },
      ],
    };
    expect(distanceToStroke(stroke, { xMm: 5, yMm: 2 })).toBeCloseTo(2);
  });
});

describe("nearestStroke", () => {
  it("selects the stroke whose path is closest to the pointer", () => {
    const far = {
      id: "far",
      points: [
        { xMm: 0, yMm: 20 },
        { xMm: 10, yMm: 20 },
      ],
    };
    const near = {
      id: "near",
      points: [
        { xMm: 0, yMm: 0 },
        { xMm: 10, yMm: 0 },
      ],
    };
    expect(nearestStroke([far, near], { xMm: 4, yMm: 1 }, 3)?.id).toBe("near");
  });

  it("returns null when every stroke is outside the threshold", () => {
    const stroke = {
      id: "line",
      points: [
        { xMm: 0, yMm: 0 },
        { xMm: 10, yMm: 0 },
      ],
    };
    expect(nearestStroke([stroke], { xMm: 5, yMm: 8 }, 3)).toBeNull();
  });
});
