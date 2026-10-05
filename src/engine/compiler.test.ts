import { describe, expect, it } from "vitest";
import { compileStrokes } from "./compiler";
import { DEFAULT_MACHINE } from "./machine";
import { getPaperSize } from "./paper";
import { executeProgram } from "./interpreter";

const a4 = getPaperSize("a4");

describe("compileStrokes", () => {
  it("emits HOME first, then travel with the pen up, then ink with the pen down", () => {
    const program = compileStrokes(
      [
        {
          id: "s1",
          points: [
            { xMm: 1, yMm: 0 },
            { xMm: 2, yMm: 0 },
          ],
        },
      ],
      {
        machine: DEFAULT_MACHINE,
        sourcePaper: a4,
        destPaper: a4,
        scaleMode: "fit",
      },
    );

    expect(program.instructions[0]).toEqual({ type: "HOME" });
    expect(program.instructions).toContainEqual({ type: "PEN", down: false });
    expect(program.instructions).toContainEqual({ type: "PEN", down: true });
    expect(
      program.instructions.filter((item) => item.type === "STEP"),
    ).toEqual([
      { type: "STEP", dx: 80, dy: 0 },
      { type: "STEP", dx: 80, dy: 0 },
    ]);
  });

  it("scales A4 handwriting onto A5 with fit so the replay stays in proportion", () => {
    const program = compileStrokes(
      [
        {
          id: "line",
          points: [
            { xMm: 0, yMm: 0 },
            { xMm: 210, yMm: 0 },
          ],
        },
      ],
      {
        machine: DEFAULT_MACHINE,
        sourcePaper: a4,
        destPaper: getPaperSize("a5"),
        scaleMode: "fit",
      },
    );

    const result = executeProgram(program);
    const last = result.inkPaths[0]?.at(-1);
    expect(last?.xSteps).toBe(mmToStepsForA5Width());
    expect(result.finalState.penDown).toBe(false);
  });

  it("ignores strokes that collapse to a single cell", () => {
    const program = compileStrokes(
      [
        {
          id: "dot",
          points: [
            { xMm: 0, yMm: 0 },
            { xMm: 0.001, yMm: 0 },
          ],
        },
      ],
      {
        machine: DEFAULT_MACHINE,
        sourcePaper: a4,
        destPaper: a4,
        scaleMode: "fit",
      },
    );

    expect(program.instructions.filter((item) => item.type === "STEP")).toEqual(
      [],
    );
  });
});

function mmToStepsForA5Width(): number {
  return Math.round(148 * 80);
}
