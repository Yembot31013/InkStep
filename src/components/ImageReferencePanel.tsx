import {
  sampleBinaryGrid,
  scanlineStrokes,
  walkStrokes,
} from "@/engine";
import { lumaFromImageFile } from "@/lib/load-image";
import { createId } from "@/lib/ids";
import { useProject } from "@/state/ProjectContext";
import { useStudioSession } from "@/state/StudioSession";
import { useRef, useState, type ChangeEvent } from "react";

export function ImageReferencePanel() {
  const { state, dispatch } = useProject();
  const {
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
  } = useStudioSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const image = await lumaFromImageFile(file);
      setReference(image);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not convert that image.",
      );
    } finally {
      setBusy(false);
    }
  };

  const traceToInk = () => {
    if (!reference) {
      return;
    }
    try {
      const grid = sampleBinaryGrid({
        luma: reference.luma,
        imageWidth: reference.width,
        imageHeight: reference.height,
        paper: state.sourcePaper,
        cellMm: state.cellMm,
        threshold,
        invert,
      });
      const makeId = () => createId("stroke");
      const strokes =
        traceMode === "hatch" ? scanlineStrokes(grid, makeId) : walkStrokes(grid, makeId);
      if (strokes.length === 0) {
        setError("No ink at this threshold. Darken it, or invert a light drawing.");
        return;
      }
      dispatch({ type: "addStrokes", strokes });
      setError(null);
    } catch (traceError) {
      setError(
        traceError instanceof Error
          ? traceError.message
          : "Could not trace the image.",
      );
    }
  };

  return (
    <section className="flex flex-col gap-3">
      <p className="text-[0.7rem] tracking-[0.08em] text-[var(--muted)] uppercase">
        Image
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        aria-label="Upload an image to convert to black and white"
        onChange={(event) => {
          void onFile(event);
        }}
      />
      <button
        type="button"
        className={reference ? "ghost-btn min-h-11" : "primary-btn min-h-11"}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? "Converting…" : reference ? "Replace image" : "Upload image"}
      </button>
      {reference ? null : (
        <p className="text-xs leading-5 text-[var(--muted)] text-pretty">
          Converts to black and white on the page so you can ink over it, or
          trace the dark pixels into strokes.
        </p>
      )}
      {reference ? (
        <>
          <p className="truncate font-mono text-xs text-[var(--text)]" title={reference.name}>
            {reference.name}
          </p>
          <label className="field">
            Threshold
            <input
              type="range"
              min={16}
              max={240}
              value={threshold}
              onChange={(event) => setThreshold(Number(event.target.value))}
            />
            <span className="font-mono text-xs tabular text-[var(--muted)]">
              {threshold}
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--text)]">
            <input
              type="checkbox"
              checked={invert}
              onChange={(event) => setInvert(event.target.checked)}
            />
            Invert
          </label>
          <label className="field">
            Overlay
            <input
              type="range"
              min={10}
              max={80}
              value={Math.round(overlayOpacity * 100)}
              onChange={(event) =>
                setOverlayOpacity(Number(event.target.value) / 100)
              }
            />
          </label>
          <label className="field">
            Trace
            <select
              value={traceMode}
              onChange={(event) =>
                setTraceMode(event.target.value as typeof traceMode)
              }
            >
              <option value="walk">Follow lines</option>
              <option value="hatch">Horizontal hatch</option>
            </select>
          </label>
          <button type="button" className="primary-btn min-h-11" onClick={traceToInk}>
            Trace to ink
          </button>
          <button
            type="button"
            className="ghost-btn min-h-11"
            onClick={() => {
              setReference(null);
              setError(null);
            }}
          >
            Remove image
          </button>
        </>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </section>
  );
}
