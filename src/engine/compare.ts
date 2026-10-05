import { mapPointToDestination } from "./paper";
import { quantizeStroke } from "./quantize";
import type {
  ExecutionResult,
  PointSteps,
  ProgramHeader,
  Stroke,
} from "./types";

export interface ReplayReport {
  matches: boolean;
  maxDeviationSteps: number;
  expectedPaths: PointSteps[][];
  actualPaths: PointSteps[][];
}

export function compareReplay(
  strokes: Stroke[],
  header: ProgramHeader,
  executed: ExecutionResult,
): ReplayReport {
  const expectedPaths = expectedInkPaths(strokes, header);
  const actualPaths = executed.inkPaths;
  const expectedPoints = flatten(expectedPaths);
  const actualPoints = flatten(actualPaths);
  const maxDeviationSteps = directedHausdorff(expectedPoints, actualPoints);

  return {
    matches: executed.ok && Number.isFinite(maxDeviationSteps) && maxDeviationSteps === 0,
    maxDeviationSteps: Number.isFinite(maxDeviationSteps) ? maxDeviationSteps : Number.POSITIVE_INFINITY,
    expectedPaths,
    actualPaths,
  };
}

export function expectedInkPaths(
  strokes: Stroke[],
  header: ProgramHeader,
): PointSteps[][] {
  const paths: PointSteps[][] = [];
  for (const stroke of strokes) {
    const mapped = stroke.points.map((point) =>
      mapPointToDestination(
        point,
        header.sourcePaper,
        header.destPaper,
        header.scaleMode,
      ),
    );
    const quantized = quantizeStroke(mapped, header.machine);
    if (quantized.length >= 2) {
      paths.push(quantized);
    }
  }
  return paths;
}

function flatten(paths: PointSteps[][]): PointSteps[] {
  return paths.flat();
}

function directedHausdorff(from: PointSteps[], to: PointSteps[]): number {
  if (from.length === 0) {
    return 0;
  }
  if (to.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  let max = 0;
  for (const point of from) {
    let min = Number.POSITIVE_INFINITY;
    for (const candidate of to) {
      const distance = chebyshev(point, candidate);
      if (distance < min) {
        min = distance;
      }
    }
    if (min > max) {
      max = min;
    }
  }
  return max;
}

function chebyshev(a: PointSteps, b: PointSteps): number {
  return Math.max(Math.abs(a.xSteps - b.xSteps), Math.abs(a.ySteps - b.ySteps));
}
