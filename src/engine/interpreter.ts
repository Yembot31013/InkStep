import { bresenhamSteps } from "./bresenham";
import { travelLimitSteps } from "./machine";
import type {
  EngineErrorInfo,
  ExecutionResult,
  Instruction,
  MachineState,
  PointSteps,
  Program,
} from "./types";

export function createIdleState(): MachineState {
  return {
    xSteps: 0,
    ySteps: 0,
    penDown: false,
    homed: false,
    instructionIndex: 0,
  };
}

export function executeProgram(program: Program): ExecutionResult {
  let state = createIdleState();
  const inkPaths: PointSteps[][] = [];
  let pulseCount = 0;

  while (state.instructionIndex < program.instructions.length) {
    const stepped = applyInstruction(program, state, inkPaths);
    pulseCount += stepped.pulses;
    state = stepped.state;
    if (stepped.error) {
      return {
        ok: false,
        finalState: state,
        inkPaths,
        pulseCount,
        error: stepped.error,
      };
    }
  }

  return {
    ok: true,
    finalState: state,
    inkPaths,
    pulseCount,
  };
}

export function stepInstruction(
  program: Program,
  state: MachineState,
  inkPaths: PointSteps[][] = [],
): { state: MachineState; done: boolean; error?: EngineErrorInfo; pulses: number } {
  if (state.instructionIndex >= program.instructions.length) {
    return { state, done: true, pulses: 0 };
  }

  const stepped = applyInstruction(program, state, inkPaths);
  return {
    state: stepped.state,
    done: stepped.state.instructionIndex >= program.instructions.length,
    error: stepped.error,
    pulses: stepped.pulses,
  };
}

function applyInstruction(
  program: Program,
  state: MachineState,
  inkPaths: PointSteps[][],
): { state: MachineState; pulses: number; error?: EngineErrorInfo } {
  const instruction = program.instructions[state.instructionIndex];
  if (!instruction) {
    return { state, pulses: 0 };
  }

  const nextIndex = state.instructionIndex + 1;

  switch (instruction.type) {
    case "HOME":
      return {
        state: {
          xSteps: 0,
          ySteps: 0,
          penDown: false,
          homed: true,
          instructionIndex: nextIndex,
        },
        pulses: Math.abs(state.xSteps) + Math.abs(state.ySteps),
      };
    case "PEN":
      if (instruction.down) {
        startInkPath(inkPaths, state);
      }
      return {
        state: {
          ...state,
          penDown: instruction.down,
          instructionIndex: nextIndex,
        },
        pulses: 0,
      };
    case "WAIT":
      return {
        state: { ...state, instructionIndex: nextIndex },
        pulses: 0,
      };
    case "STEP":
      return applyStep(program, state, instruction, inkPaths, nextIndex);
  }
}

function applyStep(
  program: Program,
  state: MachineState,
  instruction: Extract<Instruction, { type: "STEP" }>,
  inkPaths: PointSteps[][],
  nextIndex: number,
): { state: MachineState; pulses: number; error?: EngineErrorInfo } {
  if (!state.homed) {
    return {
      state,
      pulses: 0,
      error: {
        code: "NOT_HOMED",
        message: "Motors have no coordinates until HOME resets the counters to 0,0",
        instructionIndex: state.instructionIndex,
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
      state,
      pulses: 0,
      error: {
        code: "OUT_OF_BOUNDS",
        message: `Step to (${targetX}, ${targetY}) leaves the travel envelope`,
        instructionIndex: state.instructionIndex,
      },
    };
  }

  const pulses = bresenhamSteps(
    state.xSteps,
    state.ySteps,
    targetX,
    targetY,
  );
  const nextState: MachineState = {
    ...state,
    xSteps: targetX,
    ySteps: targetY,
    instructionIndex: nextIndex,
  };

  if (state.penDown) {
    appendInk(inkPaths, pulses, state);
  }

  return { state: nextState, pulses: pulses.length };
}

function startInkPath(inkPaths: PointSteps[][], state: MachineState): void {
  inkPaths.push([{ xSteps: state.xSteps, ySteps: state.ySteps }]);
}

function appendInk(
  inkPaths: PointSteps[][],
  pulses: { dx: number; dy: number }[],
  start: MachineState,
): void {
  let path = inkPaths.at(-1);
  if (!path) {
    path = [{ xSteps: start.xSteps, ySteps: start.ySteps }];
    inkPaths.push(path);
  }

  let x = start.xSteps;
  let y = start.ySteps;
  for (const pulse of pulses) {
    x += pulse.dx;
    y += pulse.dy;
    path.push({ xSteps: x, ySteps: y });
  }
}
