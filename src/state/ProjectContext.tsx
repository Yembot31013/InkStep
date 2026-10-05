import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import {
  createInitialState,
  projectReducer,
  type ProjectAction,
  type ProjectState,
} from "./project";
import { loadPersistedProject, persistProject } from "./persistence";

interface ProjectContextValue {
  state: ProjectState;
  dispatch: Dispatch<ProjectAction>;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(projectReducer, undefined, () => {
    const initial = createInitialState();
    const saved = loadPersistedProject();
    if (!saved) {
      return initial;
    }
    return {
      ...initial,
      ...saved,
      view: "studio" as const,
      tool: saved.tool ?? "ink",
    };
  });

  useEffect(() => {
    persistProject(state);
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
}

export function useProject(): ProjectContextValue {
  const value = useContext(ProjectContext);
  if (!value) {
    throw new Error("useProject must be used inside ProjectProvider");
  }
  return value;
}
