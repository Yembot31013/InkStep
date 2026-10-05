import { describe, expect, it } from "vitest";
import {
  DEFAULT_MACHINE,
  mmToSteps,
  pointMmToSteps,
  stepsToMm,
  travelLimitSteps,
} from "./machine";

describe("machine conversion", () => {
  it("uses 80 steps/mm as the default realistic belt-drive profile", () => {
    expect(DEFAULT_MACHINE.stepsPerMmX).toBe(80);
    expect(DEFAULT_MACHINE.stepsPerMmY).toBe(80);
  });

  it("converts millimetres to integer steps by rounding", () => {
    expect(mmToSteps(1, 80)).toBe(80);
    expect(mmToSteps(0.006, 80)).toBe(0);
    expect(mmToSteps(0.007, 80)).toBe(1);
  });

  it("converts a paper point into independent X/Y step counts", () => {
    expect(
      pointMmToSteps({ xMm: 10, yMm: 5 }, DEFAULT_MACHINE),
    ).toEqual({ xSteps: 800, ySteps: 400 });
  });

  it("round-trips steps back to millimetres", () => {
    expect(stepsToMm(800, DEFAULT_MACHINE.stepsPerMmX)).toBe(10);
  });

  it("computes inclusive travel limits from millimetres", () => {
    expect(travelLimitSteps(DEFAULT_MACHINE)).toEqual({
      maxX: 24000,
      maxY: 24000,
    });
  });

  it("rejects non-positive steps-per-mm", () => {
    expect(() => mmToSteps(1, 0)).toThrow(/steps per mm/i);
  });
});
