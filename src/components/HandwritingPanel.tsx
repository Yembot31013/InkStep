import {
  DEFAULT_LETTER_KEYS,
  SUGGESTED_WORDS,
  extractGlyph,
  strokesInBox,
} from "@/engine";
import { createId } from "@/lib/ids";
import { useHandLibrary, type HandTab } from "@/state/HandLibrary";
import { useProject } from "@/state/ProjectContext";
import { useStudioSession } from "@/state/StudioSession";
import { useState } from "react";

const LOWER = DEFAULT_LETTER_KEYS.filter((key) => key >= "a" && key <= "z");
const UPPER = DEFAULT_LETTER_KEYS.filter((key) => key >= "A" && key <= "Z");
const REST = DEFAULT_LETTER_KEYS.filter(
  (key) => !LOWER.includes(key) && !UPPER.includes(key),
);

const TABS: { id: HandTab; label: string }[] = [
  { id: "letters", label: "Letters" },
  { id: "words", label: "Words" },
  { id: "type", label: "Type" },
];

export function HandwritingPanel() {
  const { state, dispatch } = useProject();
  const { draft, cancelDraft, setTool } = useStudioSession();
  const hand = useHandLibrary();
  const [error, setError] = useState<string | null>(null);
  const saved = hand.activeProfile.glyphs;

  const saveFromPaper = () => {
    const key = hand.tab === "words" ? hand.wordDraft.trim() : hand.captureKey;
    if (!key || !hand.captureBox) {
      setError("Choose a letter or word first.");
      return;
    }
    const pending = draft ? [...state.strokes, draft] : state.strokes;
    const glyph = extractGlyph(pending, hand.captureBox, key, () => createId("stroke"));
    if (!glyph) {
      setError("Write on the baseline inside the box, then save.");
      return;
    }
    hand.saveGlyph(glyph);
    dispatch({
      type: "removeStrokes",
      strokeIds: strokesInBox(state.strokes, hand.captureBox).map((stroke) => stroke.id),
    });
    cancelDraft();
    setError(null);
    if (hand.tab === "letters") {
      const filled = new Set([...Object.keys(saved), key]);
      const next = DEFAULT_LETTER_KEYS.find((item) => !filled.has(item));
      if (next) {
        hand.setCaptureKey(next);
      }
    }
  };

  const placeTyped = () => {
    if (hand.typePreview.length === 0) {
      setError("Type something after saving letters or words.");
      return;
    }
    dispatch({
      type: "addStrokes",
      strokes: hand.typePreview.map((stroke) => ({
        ...stroke,
        id: createId("stroke"),
      })),
    });
    hand.setTypeText("");
    setError(null);
  };

  return (
    <section className="space-y-3">
      <p className="text-[0.7rem] tracking-[0.08em] text-[var(--muted)] uppercase">
        Handwriting
      </p>
      <p className="text-xs leading-5 text-[var(--muted)] text-pretty">
        Save this hand in the box — letters and whole words — then type. Words
        are used when they match; otherwise it spells with letters.
      </p>
      <div className="flex gap-2">
        <label className="field min-w-0 flex-1">
          Hand
          <select
            value={hand.activeProfile.id}
            onChange={(event) => hand.setActiveId(event.target.value)}
          >
            {hand.profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="ghost-btn mt-5 min-h-11" onClick={hand.createProfile}>
          New
        </button>
      </div>
      <label className="field">
        Name
        <input
          value={hand.activeProfile.name}
          onChange={(event) => hand.renameActive(event.target.value)}
        />
      </label>
      <div className="grid grid-cols-3 gap-1">
        {TABS.map((item) => {
          const active = hand.tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className="tool-btn min-h-9 rounded-md border px-2 text-sm"
              style={{
                background: active ? "var(--chrome-3)" : "transparent",
                borderColor: active ? "var(--accent)" : "var(--line)",
                color: active ? "var(--text)" : "var(--muted)",
              }}
              aria-pressed={active}
              onClick={() => {
                hand.setTab(item.id);
                if (item.id !== "type") {
                  setTool("ink");
                }
                setError(null);
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {hand.tab === "letters" ? (
        <>
          <GlyphRow keys={LOWER} saved={saved} current={hand.captureKey} onPick={hand.setCaptureKey} />
          <GlyphRow keys={UPPER} saved={saved} current={hand.captureKey} onPick={hand.setCaptureKey} />
          <GlyphRow keys={REST} saved={saved} current={hand.captureKey} onPick={hand.setCaptureKey} />
          <p className="text-xs text-[var(--muted)]">
            Now write “{hand.captureKey}” on the dashed baseline, then save.
          </p>
          <SaveRow
            saved={Boolean(saved[hand.captureKey])}
            onSave={saveFromPaper}
            onForget={() => hand.deleteGlyph(hand.captureKey)}
          />
        </>
      ) : null}

      {hand.tab === "words" ? (
        <>
          <label className="field">
            Word or phrase
            <input
              value={hand.wordDraft}
              onChange={(event) => hand.setWordDraft(event.target.value)}
              placeholder="the"
            />
          </label>
          <div className="flex flex-wrap gap-1">
            {SUGGESTED_WORDS.map((word) => (
              <button
                key={word}
                type="button"
                className="glyph-key px-2"
                data-saved={saved[word] ? "true" : "false"}
                onClick={() => hand.setWordDraft(word)}
              >
                {word}
              </button>
            ))}
          </div>
          <p className="text-xs text-[var(--muted)]">
            Write the whole word in the wide box the way you actually join it.
          </p>
          <SaveRow
            saved={Boolean(saved[hand.wordDraft.trim()])}
            onSave={saveFromPaper}
            onForget={() => {
              const key = hand.wordDraft.trim();
              if (key) {
                hand.deleteGlyph(key);
              }
            }}
          />
        </>
      ) : null}

      {hand.tab === "type" ? (
        <>
          <label className="field">
            Text
            <textarea
              rows={4}
              value={hand.typeText}
              onChange={(event) => hand.setTypeText(event.target.value)}
              placeholder="Type here and your saved hand writes it."
            />
          </label>
          {hand.missing.length > 0 ? (
            <p className="text-xs text-[var(--warn)]">
              Missing {hand.missing.join(" ")}. Save those, or add the whole word.
            </p>
          ) : null}
          {hand.truncated ? (
            <p className="text-xs text-[var(--warn)]">
              That text runs off the page. Shorten it or use a larger sheet.
            </p>
          ) : null}
          <button type="button" className="primary-btn min-h-11" onClick={placeTyped}>
            Place on paper
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

function GlyphRow({
  keys,
  saved,
  current,
  onPick,
}: {
  keys: readonly string[];
  saved: Record<string, unknown>;
  current: string;
  onPick: (key: string) => void;
}) {
  return (
    <div className="grid grid-cols-9 gap-1">
      {keys.map((key) => (
        <button
          key={key}
          type="button"
          className="glyph-key"
          data-saved={saved[key] ? "true" : "false"}
          aria-pressed={current === key}
          onClick={() => onPick(key)}
        >
          {key}
        </button>
      ))}
    </div>
  );
}

function SaveRow({
  saved,
  onSave,
  onForget,
}: {
  saved: boolean;
  onSave: () => void;
  onForget: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <button type="button" className="primary-btn min-h-11" onClick={onSave}>
        {saved ? "Replace sample" : "Save sample"}
      </button>
      {saved ? (
        <button type="button" className="ghost-btn min-h-11" onClick={onForget}>
          Forget sample
        </button>
      ) : null}
    </div>
  );
}
