import type { PointMm, Stroke } from "./types";

export function distanceToStroke(stroke: Stroke, point: PointMm): number {
  if (stroke.points.length === 0) {
    return Number.POSITIVE_INFINITY;
  }
  if (stroke.points.length === 1) {
    const only = stroke.points[0];
    if (!only) {
      return Number.POSITIVE_INFINITY;
    }
    return Math.hypot(point.xMm - only.xMm, point.yMm - only.yMm);
  }

  let min = Number.POSITIVE_INFINITY;
  for (let index = 1; index < stroke.points.length; index += 1) {
    const from = stroke.points[index - 1];
    const to = stroke.points[index];
    if (!from || !to) {
      continue;
    }
    min = Math.min(min, distanceToSegment(point, from, to));
  }
  return min;
}

export function nearestStroke(
  strokes: Stroke[],
  point: PointMm,
  thresholdMm: number,
): Stroke | null {
  let best: { stroke: Stroke; distance: number } | null = null;
  for (const stroke of strokes) {
    const distance = distanceToStroke(stroke, point);
    if (distance <= thresholdMm && (!best || distance < best.distance)) {
      best = { stroke, distance };
    }
  }
  return best?.stroke ?? null;
}

function distanceToSegment(point: PointMm, from: PointMm, to: PointMm): number {
  const dx = to.xMm - from.xMm;
  const dy = to.yMm - from.yMm;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    return Math.hypot(point.xMm - from.xMm, point.yMm - from.yMm);
  }
  const t = Math.min(
    1,
    Math.max(
      0,
      ((point.xMm - from.xMm) * dx + (point.yMm - from.yMm) * dy) / lengthSquared,
    ),
  );
  const closestX = from.xMm + t * dx;
  const closestY = from.yMm + t * dy;
  return Math.hypot(point.xMm - closestX, point.yMm - closestY);
}
