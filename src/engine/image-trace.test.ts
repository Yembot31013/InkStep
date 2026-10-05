import { describe, expect, it } from "vitest";
import { getPaperSize } from "./paper";
import {
  fitImageOnPaper,
  isInkPixel,
  lumaFromRgb,
  sampleBinaryGrid,
  scanlineStrokes,
  walkStrokes,
} from "./image-trace";

describe("lumaFromRgb", () => {
  it("treats black as 0 and white as 255", () => {
    expect(lumaFromRgb(0, 0, 0)).toBe(0);
    expect(lumaFromRgb(255, 255, 255)).toBe(255);
  });
});

describe("isInkPixel", () => {
  it("inks dark pixels below the threshold", () => {
    expect(isInkPixel(40, 128, false)).toBe(true);
    expect(isInkPixel(200, 128, false)).toBe(false);
  });

  it("inverts so light pixels become ink", () => {
    expect(isInkPixel(200, 128, true)).toBe(true);
    expect(isInkPixel(40, 128, true)).toBe(false);
  });
});

describe("fitImageOnPaper", () => {
  it("keeps aspect and pins the image to the top-left of the page", () => {
    const a4 = getPaperSize("a4");
    const placed = fitImageOnPaper(210, 210, a4);
    expect(placed.widthMm).toBeCloseTo(210);
    expect(placed.heightMm).toBeCloseTo(210);
    expect(placed.offsetXMm).toBe(0);
    expect(placed.offsetYMm).toBeCloseTo(87);
  });
});

describe("sampleBinaryGrid", () => {
  it("rejects a luma buffer that does not match the image size", () => {
    expect(() =>
      sampleBinaryGrid({
        luma: new Uint8Array(3),
        imageWidth: 2,
        imageHeight: 2,
        paper: { id: "square", name: "Square", widthMm: 10, heightMm: 10 },
        cellMm: 5,
        threshold: 128,
        invert: false,
      }),
    ).toThrow(/Luma buffer/);
  });

  it("maps a dark image pixel onto the matching paper cell", () => {
    const paper = {
      id: "square",
      name: "Square",
      widthMm: 10,
      heightMm: 10,
    };
    // 2x2 image: dark top-left, white elsewhere. Paper Y-up, image Y-down.
    const luma = new Uint8Array([20, 240, 240, 240]);
    const grid = sampleBinaryGrid({
      luma,
      imageWidth: 2,
      imageHeight: 2,
      paper,
      cellMm: 5,
      threshold: 128,
      invert: false,
    });
    expect(grid.cols).toBe(2);
    expect(grid.rows).toBe(2);
    expect(inkAt(grid, 0, 1)).toBe(true);
    expect(inkAt(grid, 1, 1)).toBe(false);
    expect(inkAt(grid, 0, 0)).toBe(false);
  });
});

describe("scanlineStrokes", () => {
  it("turns a horizontal run of black cells into one polyline", () => {
    const grid = {
      cols: 4,
      rows: 1,
      cellMm: 5,
      ink: [false, true, true, true],
    };
    const strokes = scanlineStrokes(grid, () => "s1");
    expect(strokes).toHaveLength(1);
    expect(strokes[0]?.points[0]).toEqual({ xMm: 7.5, yMm: 2.5 });
    expect(strokes[0]?.points.at(-1)).toEqual({ xMm: 17.5, yMm: 2.5 });
  });
});

describe("walkStrokes", () => {
  it("follows a bent line of black cells as one stroke", () => {
    const grid = {
      cols: 3,
      rows: 2,
      cellMm: 5,
      ink: [true, false, false, true, true, false],
    };
    const strokes = walkStrokes(grid, () => "walk");
    expect(strokes).toHaveLength(1);
    expect(strokes[0]?.points.length).toBeGreaterThanOrEqual(3);
  });
});

function inkAt(
  grid: { cols: number; ink: boolean[] },
  col: number,
  row: number,
): boolean {
  return grid.ink[row * grid.cols + col] === true;
}
