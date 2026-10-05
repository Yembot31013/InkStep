import { bresenhamSteps } from "./bresenham";
import { travelLimitSteps } from "./machine";
import type { MachineState, PointSteps, Program } from "./types";

export interface TraceFrame {
  xSteps: number;
  ySteps: number;
  penDown: boolean;
  instructionIndex: number;
}

export function expandTrace(program: Program): {
  frames: TraceFrame[];
  inkPaths: PointSteps[][];
  error?: { code: string; message: string; instructionIndex?: number };
} {
  const frames: TraceFrame[] = [
    { xSteps: 0, ySteps: 0, penDown: false, instructionIndex: 0 },
  ];
  const inkPaths: PointSteps[][] = [];
  let state: MachineState = {
    xSteps: 0,
    ySteps: 0,
    penDown: false,
    homed: false,
    instructionIndex: 0,
  };

  for (let index = 0; index < program.instructions.length; index += 1) {
    const instruction = program.instructions[index];
    if (!instruction) {
      continue;
    }

    if (instruction.type === "HOME") {
      state = {
        xSteps: 0,
        ySteps: 0,
        penDown: false,
        homed: true,
        instructionIndex: index + 1,
      };
      frames.push({
        xSteps: 0,
        ySteps: 0,
        penDown: false,
        instructionIndex: index,
      });
      continue;
    }

    if (instruction.type === "PEN") {
      state = {
        ...state,
        penDown: instruction.down,
        instructionIndex: index + 1,
      };
      if (instruction.down) {
        inkPaths.push([{ xSteps: state.xSteps, ySteps: state.ySteps }]);
      }
      frames.push({
        xSteps: state.xSteps,
        ySteps: state.ySteps,
        penDown: state.penDown,
        instructionIndex: index,
      });
      continue;
    }

    if (instruction.type === "WAIT") {
      state = { ...state, instructionIndex: index + 1 };
      frames.push({
        xSteps: state.xSteps,
        ySteps: state.ySteps,
        penDown: state.penDown,
        instructionIndex: index,
      });
      continue;
    }

    if (!state.homed) {
      return {
        frames,
        inkPaths,
        error: {
          code: "NOT_HOMED",
          message: "Motors have no coordinates until HOME resets the counters to 0,0",
          instructionIndex: index,
        },
      };
    }

    const targetX = state.xSteps + instruction.dx;
    const targetY = state.ySteps + instruction.dy;
    const limits = travelLimitSteps(program.header.machine);
    if (
      targetX < 0 ||
      targetY < 0 ||
      targetX > limits.maxX ||
      targetY > limits.maxY
    ) {
      return {
        frames,
        inkPaths,
        error: {
          code: "OUT_OF_BOUNDS",
          message: `Step to (${targetX}, ${targetY}) leaves the travel envelope`,
          instructionIndex: index,
        },
      };
    }

    const pulses = bresenhamSteps(state.xSteps, state.ySteps, targetX, targetY);
    let x = state.xSteps;
    let y = state.ySteps;
    const path = inkPaths.at(-1);
    for (const pulse of pulses) {
      x += pulse.dx;
      y += pulse.dy;
      if (state.penDown && path) {
        path.push({ xSteps: x, ySteps: y });
      }
      frames.push({
        xSteps: x,
        ySteps: y,
        penDown: state.penDown,
        instructionIndex: index,
      });
    }
    state = {
      ...state,
      xSteps: targetX,
      ySteps: targetY,
      instructionIndex: index + 1,
    };
  }

  return { frames, inkPaths };
}
