import {
  compareReplay,
  executeProgram,
  expandTrace,
  mapPointToDestination,
  parseProgram,
  pointStepsToMm,
  type ExecutionResult,
  type PointSteps,
  type Stroke,
  type TraceFrame,
} from "@/engine";
import { drawHead, drawInkPaths, drawOrigin, drawPaper, drawStrokes } from "@/lib/draw";
import { useAnimationFrame } from "@/lib/useAnimationFrame";
import { useFittedCanvas } from "@/lib/useFittedCanvas";
import { compiledProgramText } from "@/state/persistence";
import { headerFromState, type ProjectState } from "@/state/project";
import { useProject } from "@/state/ProjectContext";
import { useEffect, useMemo, useState } from "react";

export function SimulatorPanel() {
  const { state, dispatch } = useProject();
  const { canvasRef, camera } = useFittedCanvas(state.destPaper);
  const [playing, setPlaying] = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);
  const [speed, setSpeed] = useState(8);

  const loaded = useMemo(() => loadSimulation(state), [state]);
  const frames = loaded.frames;
  const safeIndex = Math.min(frameIndex, Math.max(frames.length - 1, 0));
  const frame = frames[safeIndex];
  const visibleInk = inkFromFrames(frames, safeIndex);

  useEffect(() => {
    setFrameIndex(0);
    setPlaying(false);
  }, [loaded.signature]);

  useAnimationFrame(playing && frames.length > 1, (dtMs) => {
    const advance = Math.max(1, Math.round((dtMs / 16) * speed));
    setFrameIndex((current) => {
      const next = current + advance;
      if (next >= frames.length - 1) {
        setPlaying(false);
        return frames.length - 1;
      }
      return next;
    });
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !camera) {
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#10120e";
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    drawPaper(ctx, camera, state.destPaper, state.cellMm);
    drawStrokes(ctx, camera, loaded.ghost, "rgba(28,25,20,0.28)", 1.6);
    drawInkPaths(ctx, camera, state.machine, visibleInk, "#3d8f86");
    drawOrigin(ctx, camera);
    if (frame) {
      drawHead(
        ctx,
        camera,
        pointStepsToMm(
          { xSteps: frame.xSteps, ySteps: frame.ySteps },
          state.machine,
        ),
        frame.penDown,
      );
    }
  }, [
    camera,
    canvasRef,
    frame,
    loaded.ghost,
    state.cellMm,
    state.destPaper,
    state.machine,
    visibleInk,
  ]);

  return (
    <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[1fr_300px]">
      <div className="relative min-h-0 min-w-0">
        <canvas ref={canvasRef} className="h-full w-full" aria-label="Destination paper simulator" />
      </div>
      <aside className="flex flex-col gap-4 overflow-y-auto border-t border-[var(--line)] bg-[var(--chrome-2)] p-4 lg:border-t-0 lg:border-l">
        <p className="text-[0.7rem] tracking-[0.08em] text-[var(--muted)] uppercase">
          Replay
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="primary-btn min-h-11"
            onClick={() =>
              dispatch({
                type: "setProgramText",
                programText: compiledProgramText(state),
              })
            }
          >
            Compile drawing
          </button>
          <button
            type="button"
            className="ghost-btn min-h-11"
            onClick={() => {
              setFrameIndex(0);
              setPlaying(true);
            }}
            disabled={frames.length < 2}
          >
            Play
          </button>
          <button type="button" className="ghost-btn min-h-11" onClick={() => setPlaying(false)}>
            Pause
          </button>
          <button
            type="button"
            className="ghost-btn min-h-11"
            onClick={() => setFrameIndex((value) => Math.min(value + 1, frames.length - 1))}
          >
            Step pulse
          </button>
          <button
            type="button"
            className="ghost-btn min-h-11"
            onClick={() => {
              setPlaying(false);
              setFrameIndex(Math.max(frames.length - 1, 0));
            }}
            disabled={frames.length < 2}
          >
            Jump to end
          </button>
        </div>
        <label className="field">
          Pulse speed
          <input
            type="range"
            min={1}
            max={40}
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
          />
        </label>
        {loaded.error ? (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {loaded.error}
          </p>
        ) : null}
        <div className="rounded-md border border-[var(--line)] bg-[var(--chrome)] p-3 font-mono text-xs tabular">
          <div>origin 0,0</div>
          <div>
            X {frame?.xSteps ?? 0} steps ·{" "}
            {((frame?.xSteps ?? 0) / state.machine.stepsPerMmX).toFixed(2)} mm
          </div>
          <div>
            Y {frame?.ySteps ?? 0} steps ·{" "}
            {((frame?.ySteps ?? 0) / state.machine.stepsPerMmY).toFixed(2)} mm
          </div>
          <div>pen {frame?.penDown ? "DOWN" : "UP"}</div>
          <div>
            pulse {frames.length === 0 ? 0 : safeIndex + 1} / {frames.length}
          </div>
        </div>
        <DebugReport
          result={loaded.execution}
          matches={loaded.matches}
          deviation={loaded.deviation}
        />
      </aside>
    </div>
  );
}

function DebugReport({
  result,
  matches,
  deviation,
}: {
  result: ExecutionResult | null;
  matches: boolean;
  deviation: number;
}) {
  if (!result) {
    return (
      <p className="text-sm text-[var(--muted)] text-pretty">
        Compile a drawing or paste a program to compare the pulse replay against
        the source ink.
      </p>
    );
  }
  if (!result.ok) {
    return (
      <p role="alert" className="text-sm text-[var(--danger)]">
        {result.error?.message ?? "Program halted"}
      </p>
    );
  }
  return (
    <div
      className="rounded-md border p-3 text-sm text-pretty"
      style={{
        borderColor: matches ? "var(--ok)" : "var(--warn)",
        color: matches ? "var(--ok)" : "var(--warn)",
      }}
    >
      {matches
        ? "Replay visits every compiled ink cell. This is the same engine the hardware will run."
        : `Replay diverges by ${Number.isFinite(deviation) ? deviation : "∞"} steps. Edit the program or redraw, then compile again.`}
    </div>
  );
}

function loadSimulation(state: ProjectState): {
  frames: TraceFrame[];
  ghost: Stroke[];
  execution: ExecutionResult | null;
  matches: boolean;
  deviation: number;
  error: string | null;
  signature: string;
} {
  const header = headerFromState(state);
  const ghost = mapStrokes(state.strokes, header);
  const signature = [
    state.programText,
    state.sourcePaper.id,
    state.destPaper.id,
    state.scaleMode,
    state.machine.stepsPerMmX,
    state.machine.stepsPerMmY,
    state.strokes.length,
  ].join(":");

  try {
    const source =
      state.programText.trim().length > 0
        ? state.programText
        : compiledProgramText(state);
    const program = parseProgram(source, header);
    const execution = executeProgram(program);
    const trace = expandTrace(program);
    const report = compareReplay(state.strokes, header, execution);
    return {
      frames: trace.frames,
      ghost,
      execution,
      matches: report.matches,
      deviation: report.maxDeviationSteps,
      error: trace.error?.message ?? execution.error?.message ?? null,
      signature,
    };
  } catch (error) {
    return {
      frames: [{ xSteps: 0, ySteps: 0, penDown: false, instructionIndex: 0 }],
      ghost,
      execution: null,
      matches: false,
      deviation: Number.POSITIVE_INFINITY,
      error: error instanceof Error ? error.message : "Could not load program",
      signature,
    };
  }
}

function mapStrokes(
  strokes: Stroke[],
  header: ReturnType<typeof headerFromState>,
): Stroke[] {
  return strokes.map((stroke) => ({
    ...stroke,
    points: stroke.points.map((point) =>
      mapPointToDestination(
        point,
        header.sourcePaper,
        header.destPaper,
        header.scaleMode,
      ),
    ),
  }));
}

function inkFromFrames(frames: TraceFrame[], endIndex: number): PointSteps[][] {
  const paths: PointSteps[][] = [];
  let current: PointSteps[] | null = null;
  const last = Math.min(endIndex, frames.length - 1);
  for (let index = 0; index <= last; index += 1) {
    const frame = frames[index];
    if (!frame) {
      continue;
    }
    if (frame.penDown) {
      const point = { xSteps: frame.xSteps, ySteps: frame.ySteps };
      if (!current) {
        current = [point];
        paths.push(current);
      } else {
        current.push(point);
      }
    } else {
      current = null;
    }
  }
  return paths;
}
