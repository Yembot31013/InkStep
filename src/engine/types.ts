export type ScaleMode = "fit" | "fill" | "stretch";

export interface PointMm {
  xMm: number;
  yMm: number;
}

export interface PointSteps {
  xSteps: number;
  ySteps: number;
}

export interface PaperSize {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
}

export interface MachineProfile {
  id: string;
  name: string;
  stepsPerMmX: number;
  stepsPerMmY: number;
  travelMmX: number;
  travelMmY: number;
  stepDelayMs: number;
  penUpDelayMs: number;
  penDownDelayMs: number;
}

export interface Stroke {
  id: string;
  points: PointMm[];
}

export type Instruction =
  | { type: "HOME" }
  | { type: "PEN"; down: boolean }
  | { type: "STEP"; dx: number; dy: number }
  | { type: "WAIT"; ms: number };

export interface ProgramHeader {
  machine: MachineProfile;
  sourcePaper: PaperSize;
  destPaper: PaperSize;
  scaleMode: ScaleMode;
}

export interface Program {
  header: ProgramHeader;
  instructions: Instruction[];
}

export interface MachineState {
  xSteps: number;
  ySteps: number;
  penDown: boolean;
  homed: boolean;
  instructionIndex: number;
}

export interface EngineErrorInfo {
  code: "NOT_HOMED" | "OUT_OF_BOUNDS" | "PARSE" | "VALIDATION" | "EMPTY";
  message: string;
  instructionIndex?: number;
}

export interface ExecutionResult {
  ok: boolean;
  finalState: MachineState;
  inkPaths: PointSteps[][];
  pulseCount: number;
  error?: EngineErrorInfo;
}

export interface ScaleFactors {
  scaleX: number;
  scaleY: number;
  offsetXMm: number;
  offsetYMm: number;
}
