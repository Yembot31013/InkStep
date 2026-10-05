import { EngineError } from "./errors";
import type { PaperSize, Stroke } from "./types";

export interface PlacedImage {
  widthMm: number;
  heightMm: number;
  offsetXMm: number;
  offsetYMm: number;
}

export interface BinaryGrid {
  cols: number;
  rows: number;
  cellMm: number;
  ink: boolean[];
}

export interface SampleBinaryGridInput {
  luma: Uint8Array;
  imageWidth: number;
  imageHeight: number;
  paper: PaperSize;
  cellMm: number;
  threshold: number;
  invert: boolean;
}

const CARDINAL_THEN_DIAGONAL: readonly [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

export function lumaFromRgb(r: number, g: number, b: number): number {
  return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
}

export function isInkPixel(
  luma: number,
  threshold: number,
  invert: boolean,
): boolean {
  return invert ? luma >= threshold : luma < threshold;
}

export function fitImageOnPaper(
  imageWidthPx: number,
  imageHeightPx: number,
  paper: PaperSize,
): PlacedImage {
  if (imageWidthPx <= 0 || imageHeightPx <= 0) {
    throw new EngineError("Image dimensions must be positive", "VALIDATION");
  }
  if (paper.widthMm <= 0 || paper.heightMm <= 0) {
    throw new EngineError("Paper dimensions must be positive", "VALIDATION");
  }
  const scale = Math.min(
    paper.widthMm / imageWidthPx,
    paper.heightMm / imageHeightPx,
  );
  const widthMm = imageWidthPx * scale;
  const heightMm = imageHeightPx * scale;
  return {
    widthMm,
    heightMm,
    offsetXMm: 0,
    offsetYMm: paper.heightMm - heightMm,
  };
}

export function sampleBinaryGrid(input: SampleBinaryGridInput): BinaryGrid {
  const {
    luma,
    imageWidth,
    imageHeight,
    paper,
    cellMm,
    threshold,
    invert,
  } = input;
  if (cellMm <= 0) {
    throw new EngineError("Grid cell must be positive", "VALIDATION");
  }
  if (imageWidth <= 0 || imageHeight <= 0) {
    throw new EngineError("Image dimensions must be positive", "VALIDATION");
  }
  if (luma.length !== imageWidth * imageHeight) {
    throw new EngineError("Luma buffer does not match image size", "VALIDATION");
  }

  const cols = Math.max(1, Math.floor(paper.widthMm / cellMm + 1e-9));
  const rows = Math.max(1, Math.floor(paper.heightMm / cellMm + 1e-9));
  const placed = fitImageOnPaper(imageWidth, imageHeight, paper);
  const ink = new Array<boolean>(cols * rows).fill(false);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const xMm = (col + 0.5) * cellMm;
      const yMm = (row + 0.5) * cellMm;
      const localX = xMm - placed.offsetXMm;
      const localY = yMm - placed.offsetYMm;
      if (
        localX < 0 ||
        localY < 0 ||
        localX >= placed.widthMm ||
        localY >= placed.heightMm
      ) {
        continue;
      }
      const px = clampIndex(
        Math.floor((localX / placed.widthMm) * imageWidth),
        imageWidth,
      );
      const py = clampIndex(
        Math.floor(((placed.heightMm - localY) / placed.heightMm) * imageHeight),
        imageHeight,
      );
      const sample = luma[py * imageWidth + px];
      if (sample === undefined) {
        continue;
      }
      ink[row * cols + col] = isInkPixel(sample, threshold, invert);
    }
  }

  return { cols, rows, cellMm, ink };
}

export function scanlineStrokes(
  grid: BinaryGrid,
  makeId: () => string,
): Stroke[] {
  const strokes: Stroke[] = [];
  for (let row = 0; row < grid.rows; row += 1) {
    let col = 0;
    while (col < grid.cols) {
      if (!cellInk(grid, col, row)) {
        col += 1;
        continue;
      }
      const start = col;
      while (col + 1 < grid.cols && cellInk(grid, col + 1, row)) {
        col += 1;
      }
      const points = pointsForRun(grid, start, col, row);
      if (points.length >= 2) {
        strokes.push({ id: makeId(), points });
      }
      col += 1;
    }
  }
  return strokes;
}

export function walkStrokes(grid: BinaryGrid, makeId: () => string): Stroke[] {
  const visited = new Uint8Array(grid.ink.length);
  const strokes: Stroke[] = [];
  const seeds = endpointCells(grid);
  for (let i = 0; i < grid.ink.length; i += 1) {
    if (grid.ink[i]) {
      seeds.push(i);
    }
  }

  for (const seed of seeds) {
    const startCol = seed % grid.cols;
    const startRow = Math.floor(seed / grid.cols);
    if (visited[seed] || !cellInk(grid, startCol, startRow)) {
      continue;
    }
    const chain = walkFrom(grid, visited, startCol, startRow);
    if (chain.length === 1) {
      const only = chain[0];
      if (!only) {
        continue;
      }
      strokes.push({
        id: makeId(),
        points: tickForCell(only.col, only.row, grid.cellMm),
      });
      continue;
    }
    if (chain.length >= 2) {
      strokes.push({
        id: makeId(),
        points: chain.map((cell) => cellCenter(cell.col, cell.row, grid.cellMm)),
      });
    }
  }
  return strokes;
}

function walkFrom(
  grid: BinaryGrid,
  visited: Uint8Array,
  startCol: number,
  startRow: number,
): { col: number; row: number }[] {
  markVisited(visited, grid, startCol, startRow);
  const open = unusedNeighbors(grid, visited, startCol, startRow);
  if (open.length === 0) {
    return [{ col: startCol, row: startRow }];
  }

  const first = open[0];
  if (!first) {
    return [{ col: startCol, row: startRow }];
  }
  const forward = grow(grid, visited, first.col, first.row, startCol, startRow);
  const extra = unusedNeighbors(grid, visited, startCol, startRow);
  const backwardStart = extra[0];
  if (!backwardStart) {
    return [{ col: startCol, row: startRow }, ...forward];
  }
  const backward = grow(
    grid,
    visited,
    backwardStart.col,
    backwardStart.row,
    startCol,
    startRow,
  );
  return [...backward.reverse(), { col: startCol, row: startRow }, ...forward];
}

function grow(
  grid: BinaryGrid,
  visited: Uint8Array,
  col: number,
  row: number,
  fromCol: number,
  fromRow: number,
): { col: number; row: number }[] {
  const chain: { col: number; row: number }[] = [];
  let currentCol = col;
  let currentRow = row;
  let prevCol = fromCol;
  let prevRow = fromRow;
  while (!isVisited(visited, grid, currentCol, currentRow)) {
    markVisited(visited, grid, currentCol, currentRow);
    chain.push({ col: currentCol, row: currentRow });
    const next = pickNext(grid, visited, currentCol, currentRow, prevCol, prevRow);
    if (!next) {
      break;
    }
    prevCol = currentCol;
    prevRow = currentRow;
    currentCol = next.col;
    currentRow = next.row;
  }
  return chain;
}

function pickNext(
  grid: BinaryGrid,
  visited: Uint8Array,
  col: number,
  row: number,
  prevCol: number,
  prevRow: number,
): { col: number; row: number } | null {
  const options = unusedNeighbors(grid, visited, col, row);
  if (options.length === 0) {
    return null;
  }
  const dx = col - prevCol;
  const dy = row - prevRow;
  const continued = options.find((cell) => cell.col - col === dx && cell.row - row === dy);
  return continued ?? options[0] ?? null;
}

function unusedNeighbors(
  grid: BinaryGrid,
  visited: Uint8Array,
  col: number,
  row: number,
): { col: number; row: number }[] {
  const found: { col: number; row: number }[] = [];
  for (const [dx, dy] of CARDINAL_THEN_DIAGONAL) {
    const nextCol = col + dx;
    const nextRow = row + dy;
    if (
      nextCol < 0 ||
      nextRow < 0 ||
      nextCol >= grid.cols ||
      nextRow >= grid.rows
    ) {
      continue;
    }
    if (!cellInk(grid, nextCol, nextRow)) {
      continue;
    }
    if (isVisited(visited, grid, nextCol, nextRow)) {
      continue;
    }
    found.push({ col: nextCol, row: nextRow });
  }
  return found;
}

function endpointCells(grid: BinaryGrid): number[] {
  const seeds: number[] = [];
  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      if (!cellInk(grid, col, row)) {
        continue;
      }
      if (neighborCount(grid, col, row) <= 1) {
        seeds.push(row * grid.cols + col);
      }
    }
  }
  return seeds;
}

function neighborCount(grid: BinaryGrid, col: number, row: number): number {
  let count = 0;
  for (const [dx, dy] of CARDINAL_THEN_DIAGONAL) {
    const nextCol = col + dx;
    const nextRow = row + dy;
    if (
      nextCol < 0 ||
      nextRow < 0 ||
      nextCol >= grid.cols ||
      nextRow >= grid.rows
    ) {
      continue;
    }
    if (cellInk(grid, nextCol, nextRow)) {
      count += 1;
    }
  }
  return count;
}

function pointsForRun(
  grid: BinaryGrid,
  startCol: number,
  endCol: number,
  row: number,
): { xMm: number; yMm: number }[] {
  if (startCol === endCol) {
    return tickForCell(startCol, row, grid.cellMm);
  }
  const points = [];
  for (let col = startCol; col <= endCol; col += 1) {
    points.push(cellCenter(col, row, grid.cellMm));
  }
  return points;
}

function tickForCell(
  col: number,
  row: number,
  cellMm: number,
): { xMm: number; yMm: number }[] {
  const center = cellCenter(col, row, cellMm);
  const pad = cellMm * 0.2;
  return [
    { xMm: center.xMm - pad, yMm: center.yMm },
    { xMm: center.xMm + pad, yMm: center.yMm },
  ];
}

function cellCenter(
  col: number,
  row: number,
  cellMm: number,
): { xMm: number; yMm: number } {
  return {
    xMm: (col + 0.5) * cellMm,
    yMm: (row + 0.5) * cellMm,
  };
}

function cellInk(grid: BinaryGrid, col: number, row: number): boolean {
  return grid.ink[row * grid.cols + col] === true;
}

function markVisited(
  visited: Uint8Array,
  grid: BinaryGrid,
  col: number,
  row: number,
): void {
  visited[row * grid.cols + col] = 1;
}

function isVisited(
  visited: Uint8Array,
  grid: BinaryGrid,
  col: number,
  row: number,
): boolean {
  return visited[row * grid.cols + col] === 1;
}

function clampIndex(value: number, size: number): number {
  if (value < 0) {
    return 0;
  }
  if (value >= size) {
    return size - 1;
  }
  return value;
}
