import {
  compileStrokes,
  serializeProgram,
  type Program,
} from "@/engine";
import { headerFromState, type ProjectState } from "./project";

const STORAGE_KEY = "inkstep.project.v1";

export function compileProject(state: ProjectState): Program {
  return compileStrokes(state.strokes, headerFromState(state));
}

export function compiledProgramText(state: ProjectState): string {
  return serializeProgram(compileProject(state));
}

export function persistProject(state: ProjectState): void {
  try {
    const snapshot = {
      strokes: state.strokes,
      machine: state.machine,
      sourcePaper: state.sourcePaper,
      destPaper: state.destPaper,
      scaleMode: state.scaleMode,
      cellMm: state.cellMm,
      snap: state.snap,
      tool: state.tool,
      programText: state.programText,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.error("Could not save the project", error);
  }
}

export function loadPersistedProject(): Partial<ProjectState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<ProjectState>;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    if (parsed.strokes && !Array.isArray(parsed.strokes)) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.error("Could not load the saved project", error);
    return null;
  }
}
