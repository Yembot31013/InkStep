import { describe, expect, it } from "vitest";
import { calibrateStepsPerMm, expectedMmFromSteps } from "./calibration";

describe("calibrateStepsPerMm", () => {
  it("derives steps/mm from commanded pulses and a measured millimetre travel", () => {
    expect(calibrateStepsPerMm({ commandedSteps: 1600, measuredMm: 20 })).toBe(
      80,
    );
  });

  it("rejects zero or negative measurements", () => {
    expect(() =>
      calibrateStepsPerMm({ commandedSteps: 100, measuredMm: 0 }),
    ).toThrow(/measured/i);
  });

  it("rejects non-positive step counts", () => {
    expect(() =>
      calibrateStepsPerMm({ commandedSteps: 0, measuredMm: 10 }),
    ).toThrow(/steps/i);
  });
});

describe("expectedMmFromSteps", () => {
  it("tells the operator how far a jog should travel after calibration", () => {
    expect(expectedMmFromSteps(800, 80)).toBe(10);
  });
});
