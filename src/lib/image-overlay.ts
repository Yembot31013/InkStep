import {
  fitImageOnPaper,
  isInkPixel,
  type PaperSize,
  type PlacedImage,
} from "@/engine";
import { toScreen, type Camera } from "./camera";

export function paintBinarizedOverlay(
  canvas: HTMLCanvasElement,
  luma: Uint8Array,
  width: number,
  height: number,
  threshold: number,
  invert: boolean,
): void {
  if (canvas.width !== width) {
    canvas.width = width;
  }
  if (canvas.height !== height) {
    canvas.height = height;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }
  const image = ctx.createImageData(width, height);
  const data = image.data;
  for (let i = 0; i < luma.length; i += 1) {
    const sample = luma[i] ?? 255;
    const ink = isInkPixel(sample, threshold, invert);
    const offset = i * 4;
    if (ink) {
      data[offset] = 28;
      data[offset + 1] = 25;
      data[offset + 2] = 20;
      data[offset + 3] = 230;
    } else {
      data[offset] = 0;
      data[offset + 1] = 0;
      data[offset + 2] = 0;
      data[offset + 3] = 0;
    }
  }
  ctx.putImageData(image, 0, 0);
}

export function drawReferenceOverlay(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  overlay: HTMLCanvasElement,
  placed: PlacedImage,
  opacity: number,
): void {
  const topLeft = toScreen(
    { xMm: placed.offsetXMm, yMm: placed.offsetYMm + placed.heightMm },
    camera,
  );
  const size = toScreen(
    {
      xMm: placed.offsetXMm + placed.widthMm,
      yMm: placed.offsetYMm,
    },
    camera,
  );
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    overlay,
    topLeft.x,
    topLeft.y,
    size.x - topLeft.x,
    size.y - topLeft.y,
  );
  ctx.restore();
}

export function placedImageFor(
  imageWidth: number,
  imageHeight: number,
  paper: PaperSize,
): PlacedImage {
  return fitImageOnPaper(imageWidth, imageHeight, paper);
}
