import { EngineError } from "./errors";

export function calibrateStepsPerMm(input: {
  commandedSteps: number;
  measuredMm: number;
}): number {
  if (input.measuredMm <= 0) {
    throw new EngineError("Measured travel must be a positive millimetre distance", "VALIDATION");
  }
  if (input.commandedSteps <= 0) {
    throw new EngineError("Commanded steps must be a positive pulse count", "VALIDATION");
  }
  return input.commandedSteps / input.measuredMm;
}

export function expectedMmFromSteps(
  commandedSteps: number,
  stepsPerMm: number,
): number {
  if (stepsPerMm <= 0) {
    throw new EngineError("Steps per mm must be positive", "VALIDATION");
  }
  return commandedSteps / stepsPerMm;
}
