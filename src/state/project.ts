import {
  DEFAULT_MACHINE,
  getPaperSize,
  type MachineProfile,
  type PaperSize,
  type ScaleMode,
  type Stroke,
} from "@/engine";

export type WorkspaceView = "studio" | "program" | "simulate";
export type Tool = "ink" | "path" | "cell" | "erase";
export type SnapMode = "free" | "intersection" | "cell";

export interface ProjectState {
  strokes: Stroke[];
  machine: MachineProfile;
  sourcePaper: PaperSize;
  destPaper: PaperSize;
  scaleMode: ScaleMode;
  cellMm: number;
  snap: SnapMode;
  tool: Tool;
  view: WorkspaceView;
  programText: string;
  selectedStrokeId: string | null;
}

export type ProjectAction =
  | { type: "setView"; view: WorkspaceView }
  | { type: "setTool"; tool: Tool }
  | { type: "setSnap"; snap: SnapMode }
  | { type: "setCellMm"; cellMm: number }
  | { type: "setScaleMode"; scaleMode: ScaleMode }
  | { type: "setSourcePaper"; paper: PaperSize }
  | { type: "setDestPaper"; paper: PaperSize }
  | { type: "setMachine"; machine: MachineProfile }
  | { type: "setProgramText"; programText: string }
  | { type: "addStroke"; stroke: Stroke }
  | { type: "addStrokes"; strokes: Stroke[] }
  | { type: "updateStroke"; stroke: Stroke }
  | { type: "removeStroke"; strokeId: string }
  | { type: "removeStrokes"; strokeIds: string[] }
  | { type: "selectStroke"; strokeId: string | null }
  | { type: "clearStrokes" }
  | { type: "undoStroke" };

export function createInitialState(): ProjectState {
  const a4 = getPaperSize("a4");
  return {
    strokes: [],
    machine: { ...DEFAULT_MACHINE },
    sourcePaper: a4,
    destPaper: a4,
    scaleMode: "fit",
    cellMm: 5,
    snap: "free",
    tool: "ink",
    view: "studio",
    programText: "",
    selectedStrokeId: null,
  };
}

export function projectReducer(
  state: ProjectState,
  action: ProjectAction,
): ProjectState {
  switch (action.type) {
    case "setView":
      return { ...state, view: action.view };
    case "setTool":
      return { ...state, tool: action.tool };
    case "setSnap":
      return { ...state, snap: action.snap };
    case "setCellMm":
      return { ...state, cellMm: action.cellMm };
    case "setScaleMode":
      return { ...state, scaleMode: action.scaleMode };
    case "setSourcePaper":
      return { ...state, sourcePaper: action.paper };
    case "setDestPaper":
      return { ...state, destPaper: action.paper };
    case "setMachine":
      return { ...state, machine: action.machine };
    case "setProgramText":
      return { ...state, programText: action.programText };
    case "addStroke":
      return {
        ...state,
        strokes: [...state.strokes, action.stroke],
        selectedStrokeId: action.stroke.id,
      };
    case "addStrokes": {
      if (action.strokes.length === 0) {
        return state;
      }
      return {
        ...state,
        strokes: [...state.strokes, ...action.strokes],
        selectedStrokeId: action.strokes.at(-1)?.id ?? state.selectedStrokeId,
      };
    }
    case "updateStroke":
      return {
        ...state,
        strokes: state.strokes.map((stroke) =>
          stroke.id === action.stroke.id ? action.stroke : stroke,
        ),
      };
    case "removeStroke":
      return {
        ...state,
        strokes: state.strokes.filter((stroke) => stroke.id !== action.strokeId),
        selectedStrokeId:
          state.selectedStrokeId === action.strokeId ? null : state.selectedStrokeId,
      };
    case "removeStrokes": {
      if (action.strokeIds.length === 0) {
        return state;
      }
      const removed = new Set(action.strokeIds);
      return {
        ...state,
        strokes: state.strokes.filter((stroke) => !removed.has(stroke.id)),
        selectedStrokeId: removed.has(state.selectedStrokeId ?? "")
          ? null
          : state.selectedStrokeId,
      };
    }
    case "selectStroke":
      return { ...state, selectedStrokeId: action.strokeId };
    case "clearStrokes":
      return { ...state, strokes: [], selectedStrokeId: null };
    case "undoStroke":
      return {
        ...state,
        strokes: state.strokes.slice(0, -1),
        selectedStrokeId: null,
      };
  }
}

export function headerFromState(state: ProjectState) {
  return {
    machine: state.machine,
    sourcePaper: state.sourcePaper,
    destPaper: state.destPaper,
    scaleMode: state.scaleMode,
  };
}
