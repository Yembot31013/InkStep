import { EngineError } from "./errors";
import type { PaperSize, PointMm, ScaleFactors, ScaleMode } from "./types";

export const PAPER_SIZES: readonly PaperSize[] = [
  { id: "a5", name: "A5", widthMm: 148, heightMm: 210 },
  { id: "a4", name: "A4", widthMm: 210, heightMm: 297 },
  { id: "a3", name: "A3", widthMm: 297, heightMm: 420 },
  { id: "letter", name: "Letter", widthMm: 216, heightMm: 279 },
  { id: "legal", name: "Legal", widthMm: 216, heightMm: 356 },
];

export function getPaperSize(id: string): PaperSize {
  const found = PAPER_SIZES.find((size) => size.id === id);
  if (!found) {
    throw new EngineError(`Unknown paper size: ${id}`, "VALIDATION");
  }
  return found;
}

export function scaleFactors(
  source: PaperSize,
  dest: PaperSize,
  mode: ScaleMode,
): ScaleFactors {
  assertPositivePaper(source);
  assertPositivePaper(dest);

  if (mode === "stretch") {
    return {
      scaleX: dest.widthMm / source.widthMm,
      scaleY: dest.heightMm / source.heightMm,
      offsetXMm: 0,
      offsetYMm: 0,
    };
  }

  const ratioX = dest.widthMm / source.widthMm;
  const ratioY = dest.heightMm / source.heightMm;
  const scale = mode === "fit" ? Math.min(ratioX, ratioY) : Math.max(ratioX, ratioY);

  return {
    scaleX: scale,
    scaleY: scale,
    offsetXMm: 0,
    offsetYMm: 0,
  };
}

export function mapPointToDestination(
  point: PointMm,
  source: PaperSize,
  dest: PaperSize,
  mode: ScaleMode,
): PointMm {
  const factors = scaleFactors(source, dest, mode);
  return {
    xMm: factors.offsetXMm + point.xMm * factors.scaleX,
    yMm: factors.offsetYMm + point.yMm * factors.scaleY,
  };
}

function assertPositivePaper(paper: PaperSize): void {
  if (paper.widthMm <= 0 || paper.heightMm <= 0) {
    throw new EngineError("Paper dimensions must be positive", "VALIDATION");
  }
}
