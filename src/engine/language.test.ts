import { describe, expect, it } from "vitest";
import { parseProgram, serializeProgram } from "./language";
import { DEFAULT_MACHINE } from "./machine";
import { getPaperSize } from "./paper";

const header = {
  machine: DEFAULT_MACHINE,
  sourcePaper: getPaperSize("a4"),
  destPaper: getPaperSize("a4"),
  scaleMode: "fit" as const,
};

describe("parseProgram", () => {
  it("parses a homed relative-step program", () => {
    const program = parseProgram(
      `# InkStep v1
HOME
PEN UP
STEP 80 0
PEN DOWN
STEP 40 20
WAIT 15
`,
      header,
    );

    expect(program.instructions).toEqual([
      { type: "HOME" },
      { type: "PEN", down: false },
      { type: "STEP", dx: 80, dy: 0 },
      { type: "PEN", down: true },
      { type: "STEP", dx: 40, dy: 20 },
      { type: "WAIT", ms: 15 },
    ]);
  });

  it("rejects fractional step counts because motors only count pulses", () => {
    expect(() => parseProgram("HOME\nSTEP 1.5 0\n", header)).toThrow(
      /integer/i,
    );
  });

  it("rejects unknown instructions", () => {
    expect(() => parseProgram("HOME\nGOTO 10 10\n", header)).toThrow(
      /unknown instruction/i,
    );
  });

  it("rejects empty programs", () => {
    expect(() => parseProgram("# just a comment\n", header)).toThrow(
      /empty/i,
    );
  });
});

describe("serializeProgram", () => {
  it("round-trips parsed instructions", () => {
    const source = `HOME
PEN DOWN
STEP 10 -4
PEN UP
`;
    const program = parseProgram(source, header);
    const again = parseProgram(serializeProgram(program), header);
    expect(again.instructions).toEqual(program.instructions);
  });
});
