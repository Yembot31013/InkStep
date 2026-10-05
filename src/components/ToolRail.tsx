import { ImageReferencePanel } from "@/components/ImageReferencePanel";
import { useProject } from "@/state/ProjectContext";
import { useStudioSession } from "@/state/StudioSession";
import type { Tool } from "@/state/project";

const TOOLS: { id: Tool; label: string; hint: string }[] = [
  { id: "ink", label: "Ink", hint: "Freehand handwriting" },
  { id: "path", label: "Path", hint: "Click points, Enter to join" },
  { id: "cell", label: "Cell", hint: "Paint cell centres" },
  { id: "erase", label: "Erase", hint: "Click a stroke to remove it" },
];

export function ToolRail() {
  const { state, dispatch } = useProject();
  const { draft, setTool, undo, clearPaper, commitDraft, cancelDraft } = useStudioSession();

  return (
    <aside className="flex w-[220px] shrink-0 flex-col gap-5 overflow-y-auto border-r border-[var(--line)] bg-[var(--chrome-2)] p-4">
      <div>
        <p className="mb-2 text-[0.7rem] tracking-[0.08em] text-[var(--muted)] uppercase">
          Capture
        </p>
        <div className="grid grid-cols-2 gap-2">
          {TOOLS.map((tool) => {
            const active = state.tool === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                className="tool-btn min-h-11 rounded-md border px-2 py-2 text-left text-sm"
                style={{
                  background: active ? "var(--chrome-3)" : "transparent",
                  borderColor: active ? "var(--accent)" : "var(--line)",
                  color: active ? "var(--text)" : "var(--muted)",
                }}
                onClick={() => setTool(tool.id)}
                title={tool.hint}
                aria-pressed={active}
              >
                <div className="font-medium">{tool.label}</div>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs leading-5 text-[var(--muted)] text-pretty">
          Ink is freehand. Path joins clicks — press Enter or Finish path when
          done, otherwise it stays as a live draft.
        </p>
      </div>

      <label className="field">
        Snap
        <select
          value={state.snap}
          onChange={(event) =>
            dispatch({
              type: "setSnap",
              snap: event.target.value as typeof state.snap,
            })
          }
        >
          <option value="free">Off (ink is always free)</option>
          <option value="intersection">Path: grid intersections</option>
          <option value="cell">Path: cell centres</option>
        </select>
      </label>

      <label className="field">
        Grid cell
        <select
          value={String(state.cellMm)}
          onChange={(event) =>
            dispatch({ type: "setCellMm", cellMm: Number(event.target.value) })
          }
        >
          <option value="1">1 mm</option>
          <option value="2">2 mm</option>
          <option value="5">5 mm</option>
          <option value="10">10 mm</option>
        </select>
      </label>

      {state.tool === "path" && draft ? (
        <div className="flex flex-col gap-2">
          <button type="button" className="primary-btn min-h-11" onClick={commitDraft}>
            Finish path
          </button>
          <button type="button" className="ghost-btn min-h-11" onClick={cancelDraft}>
            Cancel path
          </button>
        </div>
      ) : null}

      <ImageReferencePanel />

      <div className="mt-auto flex flex-col gap-2">
        <button type="button" className="ghost-btn min-h-11" onClick={undo}>
          Undo last stroke
        </button>
        <button type="button" className="ghost-btn min-h-11" onClick={clearPaper}>
          Clear paper
        </button>
      </div>
    </aside>
  );
}
