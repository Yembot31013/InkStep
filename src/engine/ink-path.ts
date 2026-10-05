import type { PointMm } from "./types";

export const INK_SAMPLE_MM = 0.08;
export const INK_MAX_GAP_MM = 0.25;

export function keepInkSample(
  last: PointMm | undefined,
  next: PointMm,
  minMm: number,
): boolean {
  if (!last) {
    return true;
  }
  return Math.hypot(next.xMm - last.xMm, next.yMm - last.yMm) >= minMm;
}

export function densifySegment(
  from: PointMm,
  to: PointMm,
  maxSpacingMm: number,
): PointMm[] {
  const distance = Math.hypot(to.xMm - from.xMm, to.yMm - from.yMm);
  if (distance <= maxSpacingMm || maxSpacingMm <= 0) {
    return [to];
  }
  const steps = Math.ceil(distance / maxSpacingMm);
  const points: PointMm[] = [];
  for (let index = 1; index <= steps; index += 1) {
    const t = index / steps;
    points.push({
      xMm: from.xMm + (to.xMm - from.xMm) * t,
      yMm: from.yMm + (to.yMm - from.yMm) * t,
    });
  }
  return points;
}

export function appendInkPoint(
  points: PointMm[],
  next: PointMm,
  sampleMm = INK_SAMPLE_MM,
  maxGapMm = INK_MAX_GAP_MM,
): PointMm[] {
  const last = points.at(-1);
  if (!keepInkSample(last, next, sampleMm)) {
    return points;
  }
  if (!last) {
    return [...points, next];
  }
  return [...points, ...densifySegment(last, next, maxGapMm)];
}
