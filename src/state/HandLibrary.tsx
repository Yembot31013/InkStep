import {
  captureBoxOnPaper,
  composeHandwriting,
  createEmptyProfile,
  withGlyph,
  withoutGlyph,
  type CaptureBox,
  type CaptureKind,
  type GlyphSample,
  type HandProfile,
  type Stroke,
} from "@/engine";
import { createId } from "@/lib/ids";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loadHandLibrary, persistHandLibrary } from "./hand-library";
import { useProject } from "./ProjectContext";

export type HandTab = "letters" | "words" | "type";

interface HandLibraryValue {
  profiles: HandProfile[];
  activeProfile: HandProfile;
  setActiveId: (id: string) => void;
  createProfile: () => void;
  renameActive: (name: string) => void;
  saveGlyph: (glyph: GlyphSample) => void;
  deleteGlyph: (key: string) => void;
  tab: HandTab;
  setTab: (tab: HandTab) => void;
  captureKey: string;
  setCaptureKey: (key: string) => void;
  wordDraft: string;
  setWordDraft: (value: string) => void;
  typeText: string;
  setTypeText: (value: string) => void;
  captureKind: CaptureKind | null;
  captureBox: CaptureBox | null;
  typePreview: Stroke[];
  missing: string[];
  truncated: boolean;
}

const HandLibraryContext = createContext<HandLibraryValue | null>(null);

export function HandLibraryProvider({ children }: { children: ReactNode }) {
  const { state } = useProject();
  const [snapshot, setSnapshot] = useState(loadHandLibrary);
  const [tab, setTab] = useState<HandTab>("letters");
  const [captureKey, setCaptureKey] = useState("a");
  const [wordDraft, setWordDraft] = useState("the");
  const [typeText, setTypeText] = useState("");

  const activeProfile =
    snapshot.profiles.find((profile) => profile.id === snapshot.activeId) ??
    snapshot.profiles[0] ??
    createEmptyProfile("My hand", "hand-default");

  useEffect(() => {
    persistHandLibrary(snapshot);
  }, [snapshot]);

  const setActiveId = useCallback((id: string) => {
    setSnapshot((current) => ({ ...current, activeId: id }));
  }, []);

  const createProfile = useCallback(() => {
    setSnapshot((current) => {
      const profile = createEmptyProfile(
        `Hand ${current.profiles.length + 1}`,
        createId("hand"),
      );
      return {
        profiles: [...current.profiles, profile],
        activeId: profile.id,
      };
    });
  }, []);

  const renameActive = useCallback((name: string) => {
    setSnapshot((current) => ({
      ...current,
      profiles: current.profiles.map((profile) =>
        profile.id === current.activeId ? { ...profile, name } : profile,
      ),
    }));
  }, []);

  const saveGlyph = useCallback((glyph: GlyphSample) => {
    setSnapshot((current) => ({
      ...current,
      profiles: current.profiles.map((profile) =>
        profile.id === current.activeId ? withGlyph(profile, glyph) : profile,
      ),
    }));
  }, []);

  const deleteGlyph = useCallback((key: string) => {
    setSnapshot((current) => ({
      ...current,
      profiles: current.profiles.map((profile) =>
        profile.id === current.activeId ? withoutGlyph(profile, key) : profile,
      ),
    }));
  }, []);

  const captureKind: CaptureKind | null =
    tab === "letters" ? "letter" : tab === "words" ? "word" : null;
  const activeCaptureKey = tab === "words" ? wordDraft.trim() : captureKey;
  const captureBox = useMemo(
    () =>
      captureKind && activeCaptureKey
        ? captureBoxOnPaper(state.sourcePaper, captureKind)
        : null,
    [activeCaptureKey, captureKind, state.sourcePaper],
  );

  const composed = useMemo(() => {
    if (tab !== "type" || typeText.length === 0) {
      return { strokes: [] as Stroke[], missing: [] as string[], truncated: false };
    }
    let serial = 0;
    return composeHandwriting(activeProfile, typeText, state.sourcePaper, () => {
      serial += 1;
      return `type-${serial}`;
    });
  }, [activeProfile, state.sourcePaper, tab, typeText]);

  const value = useMemo(
    () => ({
      profiles: snapshot.profiles,
      activeProfile,
      setActiveId,
      createProfile,
      renameActive,
      saveGlyph,
      deleteGlyph,
      tab,
      setTab,
      captureKey,
      setCaptureKey,
      wordDraft,
      setWordDraft,
      typeText,
      setTypeText,
      captureKind,
      captureBox,
      typePreview: composed.strokes,
      missing: composed.missing,
      truncated: composed.truncated,
    }),
    [
      activeProfile,
      captureBox,
      captureKey,
      captureKind,
      composed.missing,
      composed.strokes,
      composed.truncated,
      createProfile,
      deleteGlyph,
      renameActive,
      saveGlyph,
      setActiveId,
      snapshot.profiles,
      tab,
      typeText,
      wordDraft,
    ],
  );

  return (
    <HandLibraryContext.Provider value={value}>
      {children}
    </HandLibraryContext.Provider>
  );
}

export function useHandLibrary(): HandLibraryValue {
  const value = useContext(HandLibraryContext);
  if (!value) {
    throw new Error("useHandLibrary must be used inside HandLibraryProvider");
  }
  return value;
}
