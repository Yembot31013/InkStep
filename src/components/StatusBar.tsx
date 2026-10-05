import { useProject } from "@/state/ProjectContext";

export function StatusBar() {
  const { state } = useProject();
  const points = state.strokes.reduce((sum, stroke) => sum + stroke.points.length, 0);

  return (
    <footer className="flex h-9 shrink-0 items-center gap-4 border-t border-[var(--line)] bg-[var(--chrome-2)] px-4 font-mono text-[11px] tabular text-[var(--muted)]">
      <span>origin 0,0</span>
      <span>{state.strokes.length} strokes</span>
      <span>{points} samples</span>
      <span className="ml-auto">
        X+ right · Y+ up · motors count pulses, not coordinates
      </span>
    </footer>
  );
}
