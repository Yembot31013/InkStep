import { describe, expect, it } from "vitest";
import { compileStrokes } from "./compiler";
import { DEFAULT_MACHINE } from "./machine";
import { getPaperSize } from "./paper";
import { parseProgram } from "./language";
import { expandTrace } from "./trace";

const header = {
  machine: DEFAULT_MACHINE,
  sourcePaper: getPaperSize("a4"),
  destPaper: getPaperSize("a4"),
  scaleMode: "fit" as const,
};

describe("expandTrace", () => {
  it("expands a compiled stroke into one pulse per motor tick", () => {
    const program = compileStrokes(
      [
        {
          id: "line",
          points: [
            { xMm: 0, yMm: 0 },
            { xMm: 1, yMm: 0 },
          ],
        },
      ],
      header,
    );
    const trace = expandTrace(program);
    expect(trace.error).toBeUndefined();
    expect(trace.frames.at(-1)).toMatchObject({ xSteps: 80, ySteps: 0, penDown: false });
    expect(trace.inkPaths[0]?.at(-1)).toEqual({ xSteps: 80, ySteps: 0 });
    expect(trace.frames.some((frame) => frame.penDown)).toBe(true);
  });

  it("stops before pulsing when the program never homes", () => {
    const program = parseProgram("PEN DOWN\nSTEP 10 0\n", header);
    const trace = expandTrace(program);
    expect(trace.error?.code).toBe("NOT_HOMED");
  });

  it("stops when a pulse would leave the bed", () => {
    const program = parseProgram("HOME\nSTEP 999999 0\n", header);
    const trace = expandTrace(program);
    expect(trace.error?.code).toBe("OUT_OF_BOUNDS");
  });

  it("records WAIT without moving the head", () => {
    const program = parseProgram("HOME\nWAIT 5\n", header);
    const trace = expandTrace(program);
    expect(trace.frames.at(-1)).toMatchObject({
      xSteps: 0,
      ySteps: 0,
      instructionIndex: 1,
    });
  });
});
