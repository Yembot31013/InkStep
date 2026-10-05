import type { PaperSize, PointMm, PointSteps, Stroke } from "@/engine";
import { pointStepsToMm, type MachineProfile } from "@/engine";
import { toScreen, type Camera } from "./camera";

export function drawPaper(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  paper: PaperSize,
  cellMm: number,
): void {
  const topLeft = toScreen({ xMm: 0, yMm: paper.heightMm }, camera);
  ctx.save();
  ctx.fillStyle = "#f3ead6";
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = 1;
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(topLeft.x, topLeft.y, camera.paperWidthPx, camera.paperHeightPx, 4);
    } else {
      ctx.rect(topLeft.x, topLeft.y, camera.paperWidthPx, camera.paperHeightPx);
    }
  ctx.fill();
  ctx.stroke();

  drawGrid(ctx, camera, paper, 1, "rgba(78, 58, 32, 0.10)");
  drawGrid(ctx, camera, paper, cellMm, "rgba(78, 58, 32, 0.28)");
  ctx.restore();
}

export function drawCaptureBox(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  box: {
    xMm: number;
    yMm: number;
    widthMm: number;
    heightMm: number;
    baselineMm: number;
  },
  label: string,
): void {
  const topLeft = toScreen(
    { xMm: box.xMm, yMm: box.yMm + box.heightMm },
    camera,
  );
  const bottomRight = toScreen(
    { xMm: box.xMm + box.widthMm, yMm: box.yMm },
    camera,
  );
  const baseline = toScreen(
    { xMm: box.xMm, yMm: box.yMm + box.baselineMm },
    camera,
  );
  const width = bottomRight.x - topLeft.x;
  const height = bottomRight.y - topLeft.y;
  ctx.save();
  ctx.strokeStyle = "rgba(196, 92, 38, 0.9)";
  ctx.fillStyle = "rgba(196, 92, 38, 0.06)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(topLeft.x, topLeft.y, width, height, 3);
  } else {
    ctx.rect(topLeft.x, topLeft.y, width, height);
  }
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.strokeStyle = "rgba(196, 92, 38, 0.45)";
  ctx.setLineDash([5, 4]);
  ctx.moveTo(topLeft.x + 4, baseline.y);
  ctx.lineTo(bottomRight.x - 4, baseline.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#c45c26";
  ctx.font = "600 13px 'IBM Plex Sans', system-ui, sans-serif";
  ctx.fillText(label, topLeft.x, topLeft.y - 8);
  ctx.restore();
}

export function drawOrigin(ctx: CanvasRenderingContext2D, camera: Camera): void {
  const origin = toScreen({ xMm: 0, yMm: 0 }, camera);
  ctx.save();
  ctx.fillStyle = "#c45c26";
  ctx.beginPath();
  ctx.arc(origin.x, origin.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = "600 11px 'IBM Plex Mono', monospace";
  ctx.fillText("0,0 HOME", origin.x + 8, origin.y - 8);
  ctx.restore();
}

export function drawStrokes(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  strokes: Stroke[],
  color: string,
  lineWidth = 2,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const stroke of strokes) {
    if (stroke.points.length < 2) {
      continue;
    }
    const first = stroke.points[0];
    if (!first) {
      continue;
    }
    ctx.beginPath();
    const start = toScreen(first, camera);
    ctx.moveTo(start.x, start.y);
    for (const point of stroke.points.slice(1)) {
      const next = toScreen(point, camera);
      ctx.lineTo(next.x, next.y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export function drawInkPaths(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  machine: MachineProfile,
  paths: PointSteps[][],
  color: string,
  endIndex?: number,
): void {
  const strokes: Stroke[] = paths.map((path, index) => ({
    id: `ink-${index}`,
    points: path.map((point) => pointStepsToMm(point, machine)),
  }));
  if (endIndex === undefined) {
    drawStrokes(ctx, camera, strokes, color, 2.4);
    return;
  }

  let remaining = endIndex;
  const clipped: Stroke[] = [];
  for (const stroke of strokes) {
    if (remaining <= 0) {
      break;
    }
    const take = Math.max(1, Math.min(stroke.points.length, remaining));
    clipped.push({ ...stroke, points: stroke.points.slice(0, take) });
    remaining -= take;
  }
  drawStrokes(ctx, camera, clipped, color, 2.4);
}

export function drawHead(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  point: PointMm,
  penDown: boolean,
): void {
  const screen = toScreen(point, camera);
  ctx.save();
  ctx.strokeStyle = "#3d8f86";
  ctx.fillStyle = penDown ? "#c45c26" : "#3d8f86";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, penDown ? 6 : 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(screen.x - 10, screen.y);
  ctx.lineTo(screen.x + 10, screen.y);
  ctx.moveTo(screen.x, screen.y - 10);
  ctx.lineTo(screen.x, screen.y + 10);
  ctx.stroke();
  ctx.restore();
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  paper: PaperSize,
  stepMm: number,
  color: string,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  for (let x = 0; x <= paper.widthMm + 0.001; x += stepMm) {
    const a = toScreen({ xMm: x, yMm: 0 }, camera);
    const b = toScreen({ xMm: x, yMm: paper.heightMm }, camera);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (let y = 0; y <= paper.heightMm + 0.001; y += stepMm) {
    const a = toScreen({ xMm: 0, yMm: y }, camera);
    const b = toScreen({ xMm: paper.widthMm, yMm: y }, camera);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}
