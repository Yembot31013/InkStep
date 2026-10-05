import { HandwritingPanel } from "@/components/HandwritingPanel";
import {
  PAPER_SIZES,
  calibrateStepsPerMm,
  expectedMmFromSteps,
  type ScaleMode,
} from "@/engine";
import { useProject } from "@/state/ProjectContext";
import { useState } from "react";

export function Inspector() {
  const { state, dispatch } = useProject();
  const [jogSteps, setJogSteps] = useState(800);
  const [measuredMm, setMeasuredMm] = useState("10");
  const [axis, setAxis] = useState<"x" | "y">("x");
  const [calibrationError, setCalibrationError] = useState<string | null>(null);

  const stepsPerMm =
    axis === "x" ? state.machine.stepsPerMmX : state.machine.stepsPerMmY;

  const applyCalibration = () => {
    try {
      const measured = Number(measuredMm);
      const next = calibrateStepsPerMm({
        commandedSteps: jogSteps,
        measuredMm: measured,
      });
      dispatch({
        type: "setMachine",
        machine: {
          ...state.machine,
          stepsPerMmX: axis === "x" ? next : state.machine.stepsPerMmX,
          stepsPerMmY: axis === "y" ? next : state.machine.stepsPerMmY,
        },
      });
      setCalibrationError(null);
    } catch (error) {
      setCalibrationError(error instanceof Error ? error.message : "Calibration failed");
    }
  };

  return (
    <aside className="flex w-[300px] shrink-0 flex-col gap-5 overflow-y-auto border-l border-[var(--line)] bg-[var(--chrome-2)] p-4">
      <HandwritingPanel />

      <section className="space-y-3">
        <p className="text-[0.7rem] tracking-[0.08em] text-[var(--muted)] uppercase">
          Paper
        </p>
        <label className="field">
          Source
          <select
            value={state.sourcePaper.id}
            onChange={(event) => {
              const paper = PAPER_SIZES.find((item) => item.id === event.target.value);
              if (paper) {
                dispatch({ type: "setSourcePaper", paper });
              }
            }}
          >
            {PAPER_SIZES.map((paper) => (
              <option key={paper.id} value={paper.id}>
                {paper.name} ({paper.widthMm}×{paper.heightMm} mm)
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Destination
          <select
            value={state.destPaper.id}
            onChange={(event) => {
              const paper = PAPER_SIZES.find((item) => item.id === event.target.value);
              if (paper) {
                dispatch({ type: "setDestPaper", paper });
              }
            }}
          >
            {PAPER_SIZES.map((paper) => (
              <option key={paper.id} value={paper.id}>
                {paper.name} ({paper.widthMm}×{paper.heightMm} mm)
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Proportion
          <select
            value={state.scaleMode}
            onChange={(event) =>
              dispatch({
                type: "setScaleMode",
                scaleMode: event.target.value as ScaleMode,
              })
            }
          >
            <option value="fit">Fit (keep aspect, origin 0,0)</option>
            <option value="fill">Fill (keep aspect, may clip)</option>
            <option value="stretch">Stretch axes independently</option>
          </select>
        </label>
      </section>

      <section className="space-y-3">
        <p className="text-[0.7rem] tracking-[0.08em] text-[var(--muted)] uppercase">
          Machine
        </p>
        <label className="field">
          Steps / mm X
          <input
            type="number"
            min={1}
            step="0.1"
            value={state.machine.stepsPerMmX}
            onChange={(event) =>
              dispatch({
                type: "setMachine",
                machine: {
                  ...state.machine,
                  stepsPerMmX: Number(event.target.value),
                },
              })
            }
          />
        </label>
        <label className="field">
          Steps / mm Y
          <input
            type="number"
            min={1}
            step="0.1"
            value={state.machine.stepsPerMmY}
            onChange={(event) =>
              dispatch({
                type: "setMachine",
                machine: {
                  ...state.machine,
                  stepsPerMmY: Number(event.target.value),
                },
              })
            }
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="field">
            Travel X mm
            <input
              type="number"
              min={1}
              value={state.machine.travelMmX}
              onChange={(event) =>
                dispatch({
                  type: "setMachine",
                  machine: {
                    ...state.machine,
                    travelMmX: Number(event.target.value),
                  },
                })
              }
            />
          </label>
          <label className="field">
            Travel Y mm
            <input
              type="number"
              min={1}
              value={state.machine.travelMmY}
              onChange={(event) =>
                dispatch({
                  type: "setMachine",
                  machine: {
                    ...state.machine,
                    travelMmY: Number(event.target.value),
                  },
                })
              }
            />
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-[0.7rem] tracking-[0.08em] text-[var(--muted)] uppercase">
          Calibrate from 0,0
        </p>
        <p className="text-xs text-[var(--muted)] text-pretty">
          Jog a known pulse count from home, measure the millimetres travelled,
          then lock that into the machine profile. Steppers never store
          coordinates — they only count pulses.
        </p>
        <label className="field">
          Axis
          <select value={axis} onChange={(event) => setAxis(event.target.value as "x" | "y")}>
            <option value="x">X</option>
            <option value="y">Y</option>
          </select>
        </label>
        <label className="field">
          Commanded steps
          <input
            type="number"
            min={1}
            value={jogSteps}
            onChange={(event) => setJogSteps(Number(event.target.value))}
          />
        </label>
        <p className="font-mono text-xs tabular text-[var(--muted)]">
          Expected {expectedMmFromSteps(jogSteps, stepsPerMm).toFixed(2)} mm
        </p>
        <label className="field">
          Measured mm
          <input
            value={measuredMm}
            onChange={(event) => setMeasuredMm(event.target.value)}
          />
        </label>
        {calibrationError ? (
          <p role="alert" className="text-xs text-[var(--danger)]">
            {calibrationError}
          </p>
        ) : null}
        <button type="button" className="primary-btn min-h-11" onClick={applyCalibration}>
          Apply steps/mm
        </button>
      </section>
    </aside>
  );
}
