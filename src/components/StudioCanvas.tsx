import {
  appendInkPoint,
  cellCentersBetween,
  cellIndex,
  mmToSteps,
  nearestStroke,
  snapToCellCenter,
  snapToIntersection,
  type PointMm,
  type Stroke,
} from "@/engine";
import { clampToPaper, toPaper, type Camera } from "@/lib/camera";
import { drawCaptureBox, drawOrigin, drawPaper, drawStrokes } from "@/lib/draw";
import {
  drawReferenceOverlay,
  paintBinarizedOverlay,
  placedImageFor,
} from "@/lib/image-overlay";
import { useFittedCanvas } from "@/lib/useFittedCanvas";
import { createId } from "@/lib/ids";
import { useProject } from "@/state/ProjectContext";
import { useHandLibrary } from "@/state/HandLibrary";
import { useStudioSession } from "@/state/StudioSession";
import type { SnapMode } from "@/state/project";
import { useEffect, useRef, useState, type PointerEvent } from "react";

const ERASE_THRESHOLD_MM = 3.5;

export function StudioCanvas() {
  const { state, dispatch } = useProject();
  const {
    draft,
    setDraft,
    cancelDraft,
    commitDraft,
    reference,
    threshold,
    invert,
    overlayOpacity,
  } = useStudioSession();
  const { captureBox, captureKey, wordDraft, tab, typePreview } = useHandLibrary();
  const { canvasRef, camera } = useFittedCanvas(state.sourcePaper);
  const [cursor, setCursor] = useState<PointMm | null>(null);
  const drawingRef = useRef(false);
  const lastCellRef = useRef<{ col: number; row: number } | null>(null);
  const draftRef = useRef<Stroke | null>(draft);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  draftRef.current = draft;

  useEffect(() => {
    if (!draft) {
      drawingRef.current = false;
      lastCellRef.current = null;
    }
  }, [draft]);

  useEffect(() => {
    if (!reference) {
      overlayCanvasRef.current = null;
      return;
    }
    const overlay = overlayCanvasRef.current ?? document.createElement("canvas");
    overlayCanvasRef.current = overlay;
    paintBinarizedOverlay(
      overlay,
      reference.luma,
      reference.width,
      reference.height,
      threshold,
      invert,
    );
  }, [invert, reference, threshold]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !camera) {
      return;
    }

    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    ctx.fillStyle = "#10120e";
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    drawPaper(ctx, camera, state.sourcePaper, state.cellMm);
    if (reference && overlayCanvasRef.current) {
      drawReferenceOverlay(
        ctx,
        camera,
        overlayCanvasRef.current,
        placedImageFor(reference.width, reference.height, state.sourcePaper),
        overlayOpacity,
      );
    }
    if (captureBox) {
      const label =
        tab === "words"
          ? wordDraft.trim() || "word"
          : captureKey.length === 1
            ? captureKey
            : captureKey;
      drawCaptureBox(
        ctx,
        camera,
        captureBox,
        tab === "words" ? `Word: ${label}` : `Letter: ${label}`,
      );
    }
    drawStrokes(ctx, camera, state.strokes, "#1c1914", 2.1);
    if (typePreview.length > 0) {
      drawStrokes(ctx, camera, typePreview, "#8a4a28", 2.1);
    }
    if (draft) {
      drawStrokes(ctx, camera, [draft], "#c45c26", 2.1);
      const last = draft.points.at(-1);
      if (state.tool === "path" && last && cursor) {
        drawStrokes(
          ctx,
          camera,
          [{ id: "preview", points: [last, cursor] }],
          "rgba(196, 92, 38, 0.45)",
          1.6,
        );
      }
    }
    drawOrigin(ctx, camera);
  }, [
    camera,
    canvasRef,
    captureBox,
    captureKey,
    cursor,
    draft,
    invert,
    overlayOpacity,
    reference,
    state.cellMm,
    state.sourcePaper,
    state.strokes,
    state.tool,
    tab,
    threshold,
    typePreview,
    wordDraft,
  ]);

  const resolvePathPoint = (point: PointMm, snap: SnapMode): PointMm => {
    const clamped = clampToPaper(point, state.sourcePaper);
    if (snap === "intersection") {
      return snapToIntersection(clamped.xMm, clamped.yMm, state.cellMm);
    }
    if (snap === "cell") {
      return snapToCellCenter(clamped.xMm, clamped.yMm, state.cellMm);
    }
    return clamped;
  };

  const eventPoint = (
    event: { clientX: number; clientY: number },
    cam: Camera,
    canvas: HTMLCanvasElement,
  ): PointMm => {
    const rect = canvas.getBoundingClientRect();
    return clampToPaper(
      toPaper(event.clientX - rect.left, event.clientY - rect.top, cam),
      state.sourcePaper,
    );
  };

  const coalescedPoints = (
    event: PointerEvent<HTMLCanvasElement>,
    cam: Camera,
  ): PointMm[] => {
    const native = event.nativeEvent;
    const extras =
      typeof native.getCoalescedEvents === "function"
        ? native.getCoalescedEvents()
        : [];
    const samples = extras.length > 0 ? extras : [native];
    return samples.map((sample) => eventPoint(sample, cam, event.currentTarget));
  };

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!camera) {
      return;
    }
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Some pointers cannot capture; drawing still tracks via drawingRef.
    }

    const point = eventPoint(event, camera, event.currentTarget);
    setCursor(point);

    if (state.tool === "erase") {
      const draftHit = draft
        ? nearestStroke([draft], point, ERASE_THRESHOLD_MM)
        : null;
      if (draftHit) {
        cancelDraft();
        return;
      }
      const target = nearestStroke(state.strokes, point, ERASE_THRESHOLD_MM);
      if (target) {
        dispatch({ type: "removeStroke", strokeId: target.id });
      }
      return;
    }

    if (state.tool === "path") {
      const snapped = resolvePathPoint(point, state.snap);
      setCursor(snapped);
      const current = draftRef.current;
      const next = current
        ? { ...current, points: [...current.points, snapped] }
        : { id: createId("stroke"), points: [snapped] };
      draftRef.current = next;
      setDraft(next);
      return;
    }

    drawingRef.current = true;
    lastCellRef.current =
      state.tool === "cell" ? cellIndex(point.xMm, point.yMm, state.cellMm) : null;
    const start =
      state.tool === "cell"
        ? snapToCellCenter(point.xMm, point.yMm, state.cellMm)
        : point;
    const stroke = { id: createId("stroke"), points: [start] };
    draftRef.current = stroke;
    setDraft(stroke);
  };

  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!camera) {
      return;
    }
    const live = eventPoint(event, camera, event.currentTarget);
    setCursor(state.tool === "path" ? resolvePathPoint(live, state.snap) : live);

    if (state.tool === "path" || state.tool === "erase" || !drawingRef.current || !draftRef.current) {
      return;
    }

    if (state.tool === "cell") {
      const current = cellIndex(live.xMm, live.yMm, state.cellMm);
      const previous = lastCellRef.current ?? current;
      const extras = cellCentersBetween(previous, current, state.cellMm).slice(1);
      if (extras.length > 0) {
        const next = {
          ...draftRef.current,
          points: [...draftRef.current.points, ...extras],
        };
        draftRef.current = next;
        setDraft(next);
      }
      lastCellRef.current = current;
      return;
    }

    let points = draftRef.current.points;
    for (const sample of coalescedPoints(event, camera)) {
      points = appendInkPoint(points, sample);
    }
    const next = { ...draftRef.current, points };
    draftRef.current = next;
    setDraft(next);
  };

  const endInkStroke = () => {
    if (!drawingRef.current) {
      return;
    }
    drawingRef.current = false;
    lastCellRef.current = null;
    const stroke = draftRef.current;
    setDraft(null);
    if (stroke && stroke.points.length >= 2) {
      dispatch({ type: "addStroke", stroke });
    }
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      if (typing) {
        return;
      }
      if (event.key === "Enter" && state.tool === "path") {
        event.preventDefault();
        commitDraft();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        drawingRef.current = false;
        lastCellRef.current = null;
        cancelDraft();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancelDraft, commitDraft, state.tool]);

  return (
    <div className="relative h-full min-h-0">
      <canvas
        ref={canvasRef}
        className="h-full w-full touch-none"
        role="img"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endInkStroke}
        onPointerCancel={endInkStroke}
        aria-label="Source paper drawing grid"
      />
      <CursorHud
        cursor={cursor}
        machineStepsPerMmX={state.machine.stepsPerMmX}
        machineStepsPerMmY={state.machine.stepsPerMmY}
      />
    </div>
  );
}

function CursorHud({
  cursor,
  machineStepsPerMmX,
  machineStepsPerMmY,
}: {
  cursor: PointMm | null;
  machineStepsPerMmX: number;
  machineStepsPerMmY: number;
}) {
  if (!cursor) {
    return null;
  }
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-[var(--line)] bg-[rgba(20,22,17,0.92)] px-3 py-2 font-mono text-xs tabular text-[var(--text)]">
      <div>
        {cursor.xMm.toFixed(2)} mm, {cursor.yMm.toFixed(2)} mm
      </div>
      <div className="text-[var(--muted)]">
        {machineStepsPerMmX > 0 && machineStepsPerMmY > 0
          ? `${mmToSteps(cursor.xMm, machineStepsPerMmX)} steps X · ${mmToSteps(cursor.yMm, machineStepsPerMmY)} steps Y`
          : "Set steps/mm in the machine panel"}
      </div>
    </div>
  );
}
