import { describe, expect, it } from "vitest";
import { bresenhamSteps } from "./bresenham";

describe("bresenhamSteps", () => {
  it("emits one step on a single-axis move", () => {
    expect(bresenhamSteps(0, 0, 3, 0)).toEqual([
      { dx: 1, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: 1, dy: 0 },
    ]);
  });

  it("coordinates a diagonal so both axes finish together", () => {
    const steps = bresenhamSteps(0, 0, 4, 2);
    const sum = steps.reduce(
      (acc, step) => ({ dx: acc.dx + step.dx, dy: acc.dy + step.dy }),
      { dx: 0, dy: 0 },
    );
    expect(sum).toEqual({ dx: 4, dy: 2 });
    expect(steps).toHaveLength(4);
    expect(steps.every((step) => Math.abs(step.dx) <= 1 && Math.abs(step.dy) <= 1)).toBe(
      true,
    );
  });

  it("handles negative directions", () => {
    const sum = bresenhamSteps(5, 5, 2, 8).reduce(
      (acc, step) => ({ dx: acc.dx + step.dx, dy: acc.dy + step.dy }),
      { dx: 0, dy: 0 },
    );
    expect(sum).toEqual({ dx: -3, dy: 3 });
  });

  it("returns an empty list when already at the target", () => {
    expect(bresenhamSteps(4, 7, 4, 7)).toEqual([]);
  });
});
