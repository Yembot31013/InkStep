import { mapPointToDestination } from "./paper";
import { quantizeStroke } from "./quantize";
import type { Instruction, Program, ProgramHeader, Stroke } from "./types";

export function compileStrokes(
  strokes: Stroke[],
  header: ProgramHeader,
): Program {
  const instructions: Instruction[] = [{ type: "HOME" }, { type: "PEN", down: false }];
  let xSteps = 0;
  let ySteps = 0;
  let penDown = false;

  const travelTo = (nextX: number, nextY: number) => {
    const dx = nextX - xSteps;
    const dy = nextY - ySteps;
    if (dx === 0 && dy === 0) {
      return;
    }
    if (penDown) {
      instructions.push({ type: "PEN", down: false });
      penDown = false;
    }
    instructions.push({ type: "STEP", dx, dy });
    xSteps = nextX;
    ySteps = nextY;
  };

  const inkTo = (nextX: number, nextY: number) => {
    const dx = nextX - xSteps;
    const dy = nextY - ySteps;
    if (dx === 0 && dy === 0) {
      return;
    }
    if (!penDown) {
      instructions.push({ type: "PEN", down: true });
      penDown = true;
    }
    instructions.push({ type: "STEP", dx, dy });
    xSteps = nextX;
    ySteps = nextY;
  };

  for (const stroke of strokes) {
    const mapped = stroke.points.map((point) =>
      mapPointToDestination(
        point,
        header.sourcePaper,
        header.destPaper,
        header.scaleMode,
      ),
    );
    const quantized = quantizeStroke(mapped, header.machine);
    if (quantized.length < 2) {
      continue;
    }

    const first = quantized[0];
    if (!first) {
      continue;
    }
    travelTo(first.xSteps, first.ySteps);
    for (const point of quantized.slice(1)) {
      inkTo(point.xSteps, point.ySteps);
    }
    if (penDown) {
      instructions.push({ type: "PEN", down: false });
      penDown = false;
    }
  }

  return { header, instructions };
}
