import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Stroke } from "@/engine";
import type { ReferenceImage } from "@/lib/load-image";
import { useProject } from "./ProjectContext";
import type { Tool } from "./project";

export type TraceMode = "walk" | "hatch";

interface StudioSessionValue {
  draft: Stroke | null;
  setDraft: (stroke: Stroke | null) => void;
  cancelDraft: () => void;
  commitDraft: () => void;
  undo: () => void;
  clearPaper: () => void;
  setTool: (tool: Tool) => void;
  reference: ReferenceImage | null;
  setReference: (image: ReferenceImage | null) => void;
  threshold: number;
  setThreshold: (value: number) => void;
  invert: boolean;
  setInvert: (value: boolean) => void;
  overlayOpacity: number;
  setOverlayOpacity: (value: number) => void;
  traceMode: TraceMode;
  setTraceMode: (mode: TraceMode) => void;
}

const StudioSessionContext = createContext<StudioSessionValue | null>(null);

export function StudioSessionProvider({ children }: { children: ReactNode }) {
  const { dispatch } = useProject();
  const [draft, setDraft] = useState<Stroke | null>(null);
  const [reference, setReference] = useState<ReferenceImage | null>(null);
  const [threshold, setThreshold] = useState(128);
  const [invert, setInvert] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0.42);
  const [traceMode, setTraceMode] = useState<TraceMode>("walk");

  const cancelDraft = useCallback(() => {
    setDraft(null);
  }, []);

  const commitDraft = useCallback(() => {
    setDraft((current) => {
      if (current && current.points.length >= 2) {
        dispatch({ type: "addStroke", stroke: current });
      }
      return null;
    });
  }, [dispatch]);

  const undo = useCallback(() => {
    setDraft((current) => {
      if (current) {
        return null;
      }
      dispatch({ type: "undoStroke" });
      return null;
    });
  }, [dispatch]);

  const clearPaper = useCallback(() => {
    setDraft(null);
    dispatch({ type: "clearStrokes" });
  }, [dispatch]);

  const setTool = useCallback(
    (tool: Tool) => {
      setDraft(null);
      dispatch({ type: "setTool", tool });
    },
    [dispatch],
  );

  const value = useMemo(
    () => ({
      draft,
      setDraft,
      cancelDraft,
      commitDraft,
      undo,
      clearPaper,
      setTool,
      reference,
      setReference,
      threshold,
      setThreshold,
      invert,
      setInvert,
      overlayOpacity,
      setOverlayOpacity,
      traceMode,
      setTraceMode,
    }),
    [
      cancelDraft,
      clearPaper,
      commitDraft,
      draft,
      invert,
      overlayOpacity,
      reference,
      setTool,
      threshold,
      traceMode,
      undo,
    ],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        const target = event.target;
        if (target instanceof HTMLElement) {
          const tag = target.tagName;
          if (
            tag === "INPUT" ||
            tag === "TEXTAREA" ||
            tag === "SELECT" ||
            target.isContentEditable
          ) {
            return;
          }
        }
        event.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo]);

  return (
    <StudioSessionContext.Provider value={value}>
      {children}
    </StudioSessionContext.Provider>
  );
}

export function useStudioSession(): StudioSessionValue {
  const value = useContext(StudioSessionContext);
  if (!value) {
    throw new Error("useStudioSession must be used inside StudioSessionProvider");
  }
  return value;
}
