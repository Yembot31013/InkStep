import { describe, expect, it } from "vitest";
import { compareReplay } from "./compare";
import { compileStrokes } from "./compiler";
import { executeProgram } from "./interpreter";
import { DEFAULT_MACHINE } from "./machine";
import { getPaperSize } from "./paper";
import { parseProgram } from "./language";

const header = {
  machine: DEFAULT_MACHINE,
  sourcePaper: getPaperSize("a4"),
  destPaper: getPaperSize("a4"),
  scaleMode: "fit" as const,
};

describe("compareReplay", () => {
  it("passes when the simulator traces the compiled ink", () => {
    const strokes = [
      {
        id: "line",
        points: [
          { xMm: 5, yMm: 5 },
          { xMm: 15, yMm: 5 },
        ],
      },
    ];
    const program = compileStrokes(strokes, header);
    const executed = executeProgram(program);
    const report = compareReplay(strokes, header, executed);
    expect(report.matches).toBe(true);
    expect(report.maxDeviationSteps).toBe(0);
  });

  it("fails when the program draws a different path", () => {
    const strokes = [
      {
        id: "line",
        points: [
          { xMm: 5, yMm: 5 },
          { xMm: 15, yMm: 5 },
        ],
      },
    ];
    const program = parseProgram(
      "HOME\nPEN DOWN\nSTEP 80 80\nPEN UP\n",
      header,
    );
    const executed = executeProgram(program);
    const report = compareReplay(strokes, header, executed);
    expect(report.matches).toBe(false);
    expect(report.maxDeviationSteps).toBeGreaterThan(0);
  });
});
