import { describe, expect, it } from "vitest";
import { DEFAULT_MACHINE } from "./machine";
import { collapseDuplicateSteps, quantizeStroke } from "./quantize";

describe("quantizeStroke", () => {
  it("snaps millimetre samples onto the nearest step cell", () => {
    const quantized = quantizeStroke(
      [
        { xMm: 0, yMm: 0 },
        { xMm: 1.004, yMm: 0 },
        { xMm: 2, yMm: 0 },
      ],
      DEFAULT_MACHINE,
    );
    expect(quantized).toEqual([
      { xSteps: 0, ySteps: 0 },
      { xSteps: 80, ySteps: 0 },
      { xSteps: 160, ySteps: 0 },
    ]);
  });

  it("drops consecutive samples that land on the same step cell", () => {
    const quantized = quantizeStroke(
      [
        { xMm: 0, yMm: 0 },
        { xMm: 0.001, yMm: 0 },
        { xMm: 1, yMm: 0 },
      ],
      DEFAULT_MACHINE,
    );
    expect(quantized).toEqual([
      { xSteps: 0, ySteps: 0 },
      { xSteps: 80, ySteps: 0 },
    ]);
  });
});

describe("collapseDuplicateSteps", () => {
  it("keeps the first point of a run", () => {
    expect(
      collapseDuplicateSteps([
        { xSteps: 0, ySteps: 0 },
        { xSteps: 0, ySteps: 0 },
        { xSteps: 1, ySteps: 0 },
      ]),
    ).toEqual([
      { xSteps: 0, ySteps: 0 },
      { xSteps: 1, ySteps: 0 },
    ]);
  });
});
