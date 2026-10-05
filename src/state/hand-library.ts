import {
  createEmptyProfile,
  type HandProfile,
} from "@/engine";

const STORAGE_KEY = "inkstep.hands.v1";

export interface HandLibrarySnapshot {
  profiles: HandProfile[];
  activeId: string;
}

export function createDefaultLibrary(): HandLibrarySnapshot {
  const profile = createEmptyProfile("My hand", "hand-default");
  return { profiles: [profile], activeId: profile.id };
}

export function persistHandLibrary(snapshot: HandLibrarySnapshot): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.error("Could not save handwriting profiles", error);
  }
}

export function loadHandLibrary(): HandLibrarySnapshot {
  const fallback = createDefaultLibrary();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw) as Partial<HandLibrarySnapshot>;
    if (!parsed || !Array.isArray(parsed.profiles) || parsed.profiles.length === 0) {
      return fallback;
    }
    const profiles = parsed.profiles
      .map(sanitizeProfile)
      .filter((profile): profile is HandProfile => profile !== null);
    if (profiles.length === 0) {
      return fallback;
    }
    const activeId =
      profiles.find((profile) => profile.id === parsed.activeId)?.id ?? profiles[0]?.id;
    if (!activeId) {
      return fallback;
    }
    return { profiles, activeId };
  } catch (error) {
    console.error("Could not load handwriting profiles", error);
    return fallback;
  }
}

function sanitizeProfile(value: unknown): HandProfile | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as Partial<HandProfile>;
  if (typeof raw.id !== "string" || typeof raw.name !== "string") {
    return null;
  }
  const glyphs: HandProfile["glyphs"] = {};
  if (raw.glyphs && typeof raw.glyphs === "object") {
    for (const [key, glyph] of Object.entries(raw.glyphs)) {
      if (glyph && Array.isArray(glyph.strokes) && glyph.strokes.length > 0) {
        glyphs[key] = {
          key,
          widthMm: Number(glyph.widthMm) || 8,
          heightMm: Number(glyph.heightMm) || 48,
          baselineMm: Number(glyph.baselineMm) || 13,
          strokes: glyph.strokes,
        };
      }
    }
  }
  return {
    id: raw.id,
    name: raw.name,
    boxHeightMm: Number(raw.boxHeightMm) || 48,
    baselineMm: Number(raw.baselineMm) || 13,
    letterSpacingMm: Number(raw.letterSpacingMm) || 1.2,
    wordSpacingMm: Number(raw.wordSpacingMm) || 5,
    glyphs,
  };
}
