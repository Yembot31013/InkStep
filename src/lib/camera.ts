import type { PaperSize, PointMm } from "@/engine";

export interface Camera {
  pxPerMm: number;
  originX: number;
  originY: number;
  paperWidthPx: number;
  paperHeightPx: number;
}

export function fitPaper(
  canvasWidth: number,
  canvasHeight: number,
  paper: PaperSize,
  padding = 28,
): Camera {
  const usableWidth = Math.max(canvasWidth - padding * 2, 1);
  const usableHeight = Math.max(canvasHeight - padding * 2, 1);
  const pxPerMm = Math.min(usableWidth / paper.widthMm, usableHeight / paper.heightMm);
  const paperWidthPx = paper.widthMm * pxPerMm;
  const paperHeightPx = paper.heightMm * pxPerMm;
  const originX = (canvasWidth - paperWidthPx) / 2;
  const originY = (canvasHeight - paperHeightPx) / 2 + paperHeightPx;

  return { pxPerMm, originX, originY, paperWidthPx, paperHeightPx };
}

export function toScreen(point: PointMm, camera: Camera): { x: number; y: number } {
  return {
    x: camera.originX + point.xMm * camera.pxPerMm,
    y: camera.originY - point.yMm * camera.pxPerMm,
  };
}

export function toPaper(
  clientX: number,
  clientY: number,
  camera: Camera,
): PointMm {
  return {
    xMm: (clientX - camera.originX) / camera.pxPerMm,
    yMm: (camera.originY - clientY) / camera.pxPerMm,
  };
}

export function clampToPaper(point: PointMm, paper: PaperSize): PointMm {
  return {
    xMm: Math.min(Math.max(point.xMm, 0), paper.widthMm),
    yMm: Math.min(Math.max(point.yMm, 0), paper.heightMm),
  };
}
