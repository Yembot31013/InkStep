export { bresenhamSteps } from "./bresenham";
export { calibrateStepsPerMm, expectedMmFromSteps } from "./calibration";
export { compareReplay, expectedInkPaths } from "./compare";
export { compileStrokes } from "./compiler";
export { EngineError } from "./errors";
export { executeProgram, createIdleState, stepInstruction } from "./interpreter";
export { parseProgram, serializeProgram } from "./language";
export {
  DEFAULT_MACHINE,
  mmToSteps,
  pointMmToSteps,
  pointStepsToMm,
  stepsToMm,
  travelLimitSteps,
} from "./machine";
export {
  PAPER_SIZES,
  getPaperSize,
  mapPointToDestination,
  scaleFactors,
} from "./paper";
export { collapseDuplicateSteps, quantizeStroke } from "./quantize";
export {
  cellCentersBetween,
  cellIndex,
  snapToCellCenter,
  snapToIntersection,
} from "./grid";
export { expandTrace } from "./trace";
export type { TraceFrame } from "./trace";
export { appendInkPoint, densifySegment, keepInkSample } from "./ink-path";
export { distanceToStroke, nearestStroke } from "./stroke-hit";
export {
  fitImageOnPaper,
  isInkPixel,
  lumaFromRgb,
  sampleBinaryGrid,
  scanlineStrokes,
  walkStrokes,
} from "./image-trace";
export type { BinaryGrid, PlacedImage, SampleBinaryGridInput } from "./image-trace";
export {
  captureBoxOnPaper,
  composeHandwriting,
  createEmptyProfile,
  extractGlyph,
  strokesInBox,
  tokenizeHandwriting,
  withGlyph,
  withoutGlyph,
  DEFAULT_LETTER_KEYS,
  SUGGESTED_WORDS,
} from "./handwriting";
export type {
  CaptureBox,
  CaptureKind,
  ComposeResult,
  GlyphSample,
  HandProfile,
} from "./handwriting";
export type {
  EngineErrorInfo,
  ExecutionResult,
  Instruction,
  MachineProfile,
  MachineState,
  PaperSize,
  PointMm,
  PointSteps,
  Program,
  ProgramHeader,
  ScaleMode,
  Stroke,
} from "./types";
