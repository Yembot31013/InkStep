import { EngineError } from "./errors";
import type { Instruction, Program, ProgramHeader } from "./types";

const KEYWORD = /^(HOME|PEN|STEP|WAIT)\b/i;

export function parseProgram(source: string, header: ProgramHeader): Program {
  const instructions: Instruction[] = [];
  const lines = source.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index] ?? "";
    const trimmed = stripComment(raw).trim();
    if (trimmed.length === 0) {
      continue;
    }

    const instruction = parseLine(trimmed, index + 1);
    instructions.push(instruction);
  }

  if (instructions.length === 0) {
    throw new EngineError("Program is empty", "EMPTY");
  }

  return { header, instructions };
}

export function serializeProgram(program: Program): string {
  const { machine, sourcePaper, destPaper, scaleMode } = program.header;
  const lines = [
    `# InkStep v1`,
    `# machine ${machine.id} steps_per_mm_x=${machine.stepsPerMmX} steps_per_mm_y=${machine.stepsPerMmY}`,
    `# paper_source ${sourcePaper.id} ${sourcePaper.widthMm} ${sourcePaper.heightMm}`,
    `# paper_dest ${destPaper.id} ${destPaper.widthMm} ${destPaper.heightMm}`,
    `# scale ${scaleMode}`,
    ``,
    ...program.instructions.map(serializeInstruction),
    ``,
  ];
  return lines.join("\n");
}

function stripComment(line: string): string {
  return line.replace(/[#;].*$/, "");
}

function parseLine(line: string, lineNumber: number): Instruction {
  if (!KEYWORD.test(line)) {
    throw new EngineError(
      `Unknown instruction on line ${lineNumber}: ${line}`,
      "PARSE",
    );
  }

  const tokens = line.split(/\s+/);
  const verb = (tokens[0] ?? "").toUpperCase();

  if (verb === "HOME") {
    assertArity(tokens, 1, lineNumber, "HOME");
    return { type: "HOME" };
  }

  if (verb === "PEN") {
    const state = (tokens[1] ?? "").toUpperCase();
    if (tokens.length !== 2 || (state !== "UP" && state !== "DOWN")) {
      throw new EngineError(
        `PEN on line ${lineNumber} must be UP or DOWN`,
        "PARSE",
      );
    }
    return { type: "PEN", down: state === "DOWN" };
  }

  if (verb === "STEP") {
    assertArity(tokens, 3, lineNumber, "STEP");
    return {
      type: "STEP",
      dx: parseInteger(tokens[1], lineNumber, "STEP dx"),
      dy: parseInteger(tokens[2], lineNumber, "STEP dy"),
    };
  }

  assertArity(tokens, 2, lineNumber, "WAIT");
  return { type: "WAIT", ms: parseInteger(tokens[1], lineNumber, "WAIT ms") };
}

function serializeInstruction(instruction: Instruction): string {
  switch (instruction.type) {
    case "HOME":
      return "HOME";
    case "PEN":
      return instruction.down ? "PEN DOWN" : "PEN UP";
    case "STEP":
      return `STEP ${instruction.dx} ${instruction.dy}`;
    case "WAIT":
      return `WAIT ${instruction.ms}`;
  }
}

function parseInteger(
  token: string | undefined,
  lineNumber: number,
  label: string,
): number {
  if (token === undefined || !/^-?\d+$/.test(token)) {
    throw new EngineError(
      `${label} on line ${lineNumber} must be an integer`,
      "PARSE",
    );
  }
  return Number.parseInt(token, 10);
}

function assertArity(
  tokens: string[],
  expected: number,
  lineNumber: number,
  verb: string,
): void {
  if (tokens.length !== expected) {
    throw new EngineError(
      `${verb} on line ${lineNumber} has the wrong number of arguments`,
      "PARSE",
    );
  }
}
