import { EngineError, parseProgram } from "@/engine";
import { compiledProgramText } from "@/state/persistence";
import { headerFromState } from "@/state/project";
import { useProject } from "@/state/ProjectContext";
import { useMemo, useState } from "react";

export function ProgramPanel() {
  const { state, dispatch } = useProject();
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    try {
      const program = parseProgram(
        state.programText || compiledProgramText(state),
        headerFromState(state),
      );
      const steps = program.instructions.filter((item) => item.type === "STEP");
      const pulses = steps.reduce(
        (sum, item) => sum + Math.max(Math.abs(item.dx), Math.abs(item.dy)),
        0,
      );
      return {
        instructions: program.instructions.length,
        moves: steps.length,
        pulses,
      };
    } catch {
      return null;
    }
  }, [state]);

  const generate = () => {
    try {
      const text = compiledProgramText(state);
      dispatch({ type: "setProgramText", programText: text });
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Compile failed");
    }
  };

  const validate = () => {
    try {
      parseProgram(state.programText, headerFromState(state));
      setError(null);
    } catch (caught) {
      const message =
        caught instanceof EngineError || caught instanceof Error
          ? caught.message
          : "Program is invalid";
      setError(message);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="primary-btn min-h-11" onClick={generate}>
          Generate from drawing
        </button>
        <button type="button" className="ghost-btn min-h-11" onClick={validate}>
          Validate
        </button>
        {stats ? (
          <p className="ml-auto font-mono text-xs tabular text-[var(--muted)]">
            {stats.instructions} instructions · {stats.moves} moves · {stats.pulses} pulses
          </p>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : (
        <p className="text-sm text-[var(--muted)] text-pretty">
          This is the same pulse language the simulator and future firmware
          interpret. Coordinates are never stored — only HOME plus relative STEP
          counts.
        </p>
      )}
      <textarea
        className="min-h-0 flex-1 resize-none rounded-md border border-[var(--line)] bg-[#0f110d] p-4 font-mono text-[13px] leading-6 text-[#e7dcc4] outline-none"
        spellCheck={false}
        value={state.programText}
        onChange={(event) =>
          dispatch({ type: "setProgramText", programText: event.target.value })
        }
        aria-label="InkStep motion program"
        placeholder={"HOME\nPEN UP\nSTEP 80 0\nPEN DOWN\nSTEP 40 20"}
      />
    </div>
  );
}
