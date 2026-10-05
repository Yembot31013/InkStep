import { useProject } from "@/state/ProjectContext";
import type { WorkspaceView } from "@/state/project";

const VIEWS: { id: WorkspaceView; label: string }[] = [
  { id: "studio", label: "Studio" },
  { id: "program", label: "Program" },
  { id: "simulate", label: "Simulate" },
];

export function AppHeader() {
  const { state, dispatch } = useProject();

  return (
    <header className="flex h-14 shrink-0 items-center gap-6 border-b border-[var(--line)] bg-[var(--chrome-2)] px-4">
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-semibold tracking-tight">InkStep</span>
        <span className="text-xs text-[var(--muted)]">XY writing studio</span>
      </div>
      <nav className="flex gap-1" aria-label="Workspace">
        {VIEWS.map((view) => {
          const active = state.view === view.id;
          return (
            <button
              key={view.id}
              type="button"
              className="tab-btn min-h-11 rounded-md px-3 text-sm"
              style={{
                background: active ? "var(--chrome-3)" : "transparent",
                color: active ? "var(--text)" : "var(--muted)",
              }}
              aria-current={active ? "page" : undefined}
              onClick={() => dispatch({ type: "setView", view: view.id })}
            >
              {view.label}
            </button>
          );
        })}
      </nav>
      <p className="ml-auto hidden font-mono text-xs tabular text-[var(--muted)] sm:block">
        {state.sourcePaper.name} → {state.destPaper.name} · {state.scaleMode} ·{" "}
        {state.machine.stepsPerMmX}/{state.machine.stepsPerMmY} steps/mm
      </p>
    </header>
  );
}
