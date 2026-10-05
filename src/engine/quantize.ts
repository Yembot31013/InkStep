import { pointMmToSteps } from "./machine";
import type { MachineProfile, PointMm, PointSteps } from "./types";

export function collapseDuplicateSteps(points: PointSteps[]): PointSteps[] {
  const collapsed: PointSteps[] = [];
  for (const point of points) {
    const previous = collapsed.at(-1);
    if (
      previous &&
      previous.xSteps === point.xSteps &&
      previous.ySteps === point.ySteps
    ) {
      continue;
    }
    collapsed.push(point);
  }
  return collapsed;
}

export function quantizeStroke(
  points: PointMm[],
  machine: MachineProfile,
): PointSteps[] {
  return collapseDuplicateSteps(
    points.map((point) => pointMmToSteps(point, machine)),
  );
}
