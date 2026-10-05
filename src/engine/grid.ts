import { bresenhamSteps } from "./bresenham";

export function snapToIntersection(xMm: number, yMm: number, cellMm: number): {
  xMm: number;
  yMm: number;
} {
  const size = Math.max(cellMm, 0.1);
  return {
    xMm: Math.round(xMm / size) * size,
    yMm: Math.round(yMm / size) * size,
  };
}

export function snapToCellCenter(xMm: number, yMm: number, cellMm: number): {
  xMm: number;
  yMm: number;
} {
  const size = Math.max(cellMm, 0.1);
  return {
    xMm: (Math.floor(xMm / size) + 0.5) * size,
    yMm: (Math.floor(yMm / size) + 0.5) * size,
  };
}

export function cellIndex(xMm: number, yMm: number, cellMm: number): {
  col: number;
  row: number;
} {
  const size = Math.max(cellMm, 0.1);
  return {
    col: Math.floor(xMm / size),
    row: Math.floor(yMm / size),
  };
}

export function cellCentersBetween(
  from: { col: number; row: number },
  to: { col: number; row: number },
  cellMm: number,
): { xMm: number; yMm: number }[] {
  const pulses = bresenhamSteps(from.col, from.row, to.col, to.row);
  const points: { xMm: number; yMm: number }[] = [
    cellCenter(from.col, from.row, cellMm),
  ];
  let col = from.col;
  let row = from.row;
  for (const pulse of pulses) {
    col += pulse.dx;
    row += pulse.dy;
    points.push(cellCenter(col, row, cellMm));
  }
  return points;
}

function cellCenter(col: number, row: number, cellMm: number): {
  xMm: number;
  yMm: number;
} {
  return {
    xMm: (col + 0.5) * cellMm,
    yMm: (row + 0.5) * cellMm,
  };
}
