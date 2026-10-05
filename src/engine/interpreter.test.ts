import { describe, expect, it } from "vitest";
import { compileStrokes } from "./compiler";
import { executeProgram, stepInstruction } from "./interpreter";
import { parseProgram } from "./language";
import { DEFAULT_MACHINE } from "./machine";
import { getPaperSize } from "./paper";

const header = {
  machine: DEFAULT_MACHINE,
  sourcePaper: getPaperSize("a4"),
  destPaper: getPaperSize("a4"),
  scaleMode: "fit" as const,
};

describe("executeProgram", () => {
  it("refuses to step before homing because motors only have a pulse count", () => {
    const program = parseProgram("PEN DOWN\nSTEP 10 0\n", header);
    const result = executeProgram(program);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("NOT_HOMED");
  });

  it("resets counters to 0,0 on HOME", () => {
    const program = parseProgram("HOME\nSTEP 80 40\nHOME\n", header);
    const result = executeProgram(program);
    expect(result.ok).toBe(true);
    expect(result.finalState.xSteps).toBe(0);
    expect(result.finalState.ySteps).toBe(0);
    expect(result.finalState.homed).toBe(true);
  });

  it("records ink only while the pen is down", () => {
    const program = parseProgram(
      "HOME\nSTEP 80 0\nPEN DOWN\nSTEP 80 0\nPEN UP\nSTEP 0 80\n",
      header,
    );
    const result = executeProgram(program);
    expect(result.ok).toBe(true);
    expect(result.inkPaths).toHaveLength(1);
    expect(result.inkPaths[0]?.[0]).toEqual({ xSteps: 80, ySteps: 0 });
    expect(result.inkPaths[0]?.at(-1)).toEqual({ xSteps: 160, ySteps: 0 });
    expect(result.finalState.xSteps).toBe(160);
    expect(result.finalState.ySteps).toBe(80);
  });

  it("halts when a step would leave the travel envelope", () => {
    const program = parseProgram("HOME\nSTEP 999999 0\n", header);
    const result = executeProgram(program);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("OUT_OF_BOUNDS");
  });

  it("replays compiled handwriting onto the same step cells", () => {
    const strokes = [
      {
        id: "sig",
        points: [
          { xMm: 10, yMm: 10 },
          { xMm: 20, yMm: 10 },
          { xMm: 20, yMm: 20 },
        ],
      },
    ];
    const program = compileStrokes(strokes, header);
    const result = executeProgram(program);
    expect(result.ok).toBe(true);
    expect(result.inkPaths[0]?.at(-1)).toEqual({
      xSteps: 1600,
      ySteps: 1600,
    });
  });
});

describe("stepInstruction", () => {
  it("exposes a single-instruction cursor for the debugger", () => {
    const program = parseProgram("HOME\nSTEP 2 0\n", header);
    const afterHome = stepInstruction(program, {
      xSteps: 0,
      ySteps: 0,
      penDown: false,
      homed: false,
      instructionIndex: 0,
    });
    expect(afterHome.state.homed).toBe(true);
    const afterStep = stepInstruction(program, afterHome.state);
    expect(afterStep.state.xSteps).toBe(2);
    expect(afterStep.state.instructionIndex).toBe(2);
    expect(afterStep.done).toBe(true);
  });
});
