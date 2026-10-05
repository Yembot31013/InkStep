import { EngineError } from "./errors";
import type { MachineProfile, PointMm, PointSteps } from "./types";

export const DEFAULT_MACHINE: MachineProfile = {
  id: "desktop-xy",
  name: "Desktop XY (GT2 80 steps/mm)",
  stepsPerMmX: 80,
  stepsPerMmY: 80,
  travelMmX: 300,
  travelMmY: 300,
  stepDelayMs: 1,
  penUpDelayMs: 80,
  penDownDelayMs: 80,
};

export function mmToSteps(mm: number, stepsPerMm: number): number {
  if (stepsPerMm <= 0) {
    throw new EngineError("Steps per mm must be positive", "VALIDATION");
  }
  return Math.round(mm * stepsPerMm);
}

export function stepsToMm(steps: number, stepsPerMm: number): number {
  if (stepsPerMm <= 0) {
    throw new EngineError("Steps per mm must be positive", "VALIDATION");
  }
  return steps / stepsPerMm;
}

export function pointMmToSteps(
  point: PointMm,
  machine: MachineProfile,
): PointSteps {
  return {
    xSteps: mmToSteps(point.xMm, machine.stepsPerMmX),
    ySteps: mmToSteps(point.yMm, machine.stepsPerMmY),
  };
}

export function pointStepsToMm(
  point: PointSteps,
  machine: MachineProfile,
): PointMm {
  return {
    xMm: stepsToMm(point.xSteps, machine.stepsPerMmX),
    yMm: stepsToMm(point.ySteps, machine.stepsPerMmY),
  };
}

export function travelLimitSteps(machine: MachineProfile): {
  maxX: number;
  maxY: number;
} {
  return {
    maxX: mmToSteps(machine.travelMmX, machine.stepsPerMmX),
    maxY: mmToSteps(machine.travelMmY, machine.stepsPerMmY),
  };
}
