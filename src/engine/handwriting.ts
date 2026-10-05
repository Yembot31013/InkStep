import type { PaperSize, PointMm, Stroke } from "./types";

export type CaptureKind = "letter" | "word";

export interface CaptureBox {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  baselineMm: number;
}

export interface GlyphSample {
  key: string;
  widthMm: number;
  heightMm: number;
  baselineMm: number;
  strokes: Stroke[];
}

export interface HandProfile {
  id: string;
  name: string;
  boxHeightMm: number;
  baselineMm: number;
  letterSpacingMm: number;
  wordSpacingMm: number;
  glyphs: Record<string, GlyphSample>;
}

export interface ComposeResult {
  strokes: Stroke[];
  missing: string[];
  truncated: boolean;
}

export const DEFAULT_LETTER_KEYS: readonly string[] = [
  ..."abcdefghijklmnopqrstuvwxyz".split(""),
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  ..."0123456789".split(""),
  ".",
  ",",
  "!",
  "?",
  "'",
  "-",
  ":",
  ";",
];

export const SUGGESTED_WORDS: readonly string[] = [
  "the",
  "and",
  "of",
  "to",
  "in",
  "is",
  "you",
  "for",
  "that",
  "with",
];

const LETTER_BOX_WIDTH_MM = 52;
const BOX_HEIGHT_MM = 60;
const BASELINE_FROM_BOTTOM_MM = 16;
const SIDE_BEARING_MM = 0.35;
const PAGE_MARGIN_MM = 12;

export function createEmptyProfile(name: string, id = "hand"): HandProfile {
  return {
    id,
    name,
    boxHeightMm: BOX_HEIGHT_MM,
    baselineMm: BASELINE_FROM_BOTTOM_MM,
    letterSpacingMm: 1.2,
    wordSpacingMm: 5,
    glyphs: {},
  };
}

export function withGlyph(profile: HandProfile, glyph: GlyphSample): HandProfile {
  return {
    ...profile,
    glyphs: { ...profile.glyphs, [glyph.key]: glyph },
  };
}

export function withoutGlyph(profile: HandProfile, key: string): HandProfile {
  const next = { ...profile.glyphs };
  delete next[key];
  return { ...profile, glyphs: next };
}

export function captureBoxOnPaper(paper: PaperSize, kind: CaptureKind): CaptureBox {
  const heightMm = BOX_HEIGHT_MM;
  const widthMm =
    kind === "word"
      ? Math.min(paper.widthMm - 24, Math.max(120, paper.widthMm * 0.72))
      : LETTER_BOX_WIDTH_MM;
  const xMm = Math.max(8, (paper.widthMm - widthMm) / 2);
  const yMm = Math.max(
    24,
    Math.min(paper.heightMm * 0.34, paper.heightMm - heightMm - 24),
  );
  return {
    xMm,
    yMm,
    widthMm,
    heightMm,
    baselineMm: BASELINE_FROM_BOTTOM_MM,
  };
}

export function tokenizeHandwriting(text: string, keys: Set<string>): string[] {
  const dictionary = [...keys]
    .filter((key) => key.length > 0 && key !== " " && key !== "\n")
    .sort((left, right) => right.length - left.length);
  const tokens: string[] = [];
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    if (char === "\n" || char === "\r") {
      tokens.push("\n");
      if (char === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
      index += 1;
      continue;
    }
    if (char === " " || char === "\t") {
      tokens.push(" ");
      index += 1;
      continue;
    }
    const matched = dictionary.find((key) => text.startsWith(key, index));
    tokens.push(matched ?? char ?? "");
    index += matched?.length ?? 1;
  }
  return tokens.filter((token) => token.length > 0);
}

export function strokesInBox(strokes: Stroke[], box: CaptureBox): Stroke[] {
  return strokes.filter((stroke) => strokeHitsBox(stroke, box));
}

export function extractGlyph(
  strokes: Stroke[],
  box: CaptureBox,
  key: string,
  makeId: () => string,
): GlyphSample | null {
  const captured = strokesInBox(strokes, box);
  if (captured.length === 0) {
    return null;
  }
  const local = captured.map((stroke) => ({
    id: makeId(),
    points: stroke.points.map((point) => ({
      xMm: point.xMm - box.xMm,
      yMm: point.yMm - box.yMm,
    })),
  }));
  const bounds = strokeBounds(local);
  if (!bounds) {
    return null;
  }
  const shiftX = bounds.minX - SIDE_BEARING_MM;
  const shifted = local.map((stroke) => ({
    ...stroke,
    points: stroke.points.map((point) => ({
      xMm: point.xMm - shiftX,
      yMm: point.yMm,
    })),
  }));
  return {
    key,
    widthMm: bounds.maxX - shiftX + SIDE_BEARING_MM,
    heightMm: box.heightMm,
    baselineMm: box.baselineMm,
    strokes: shifted,
  };
}

export function composeHandwriting(
  profile: HandProfile,
  text: string,
  paper: PaperSize,
  makeId: () => string,
): ComposeResult {
  const keys = new Set(Object.keys(profile.glyphs));
  const tokens = tokenizeHandwriting(text, keys);
  const missing: string[] = [];
  const strokes: Stroke[] = [];
  let truncated = false;
  const maxX = paper.widthMm - PAGE_MARGIN_MM;
  const lineHeight = profile.boxHeightMm * 0.95;
  const fallbackWidth = averageAdvance(profile) || profile.boxHeightMm * 0.28;
  let xMm = PAGE_MARGIN_MM;
  let baselineY =
    paper.heightMm - 16 - (profile.boxHeightMm - profile.baselineMm);

  for (const token of tokens) {
    if (token === "\n") {
      xMm = PAGE_MARGIN_MM;
      baselineY -= lineHeight;
      continue;
    }
    if (token === " ") {
      xMm += profile.wordSpacingMm;
      if (xMm > maxX) {
        xMm = PAGE_MARGIN_MM;
        baselineY -= lineHeight;
      }
      continue;
    }

    const glyph = profile.glyphs[token];
    if (!glyph) {
      if (!missing.includes(token)) {
        missing.push(token);
      }
      xMm += fallbackWidth + profile.letterSpacingMm;
      continue;
    }

    if (xMm + glyph.widthMm > maxX && xMm > PAGE_MARGIN_MM) {
      xMm = PAGE_MARGIN_MM;
      baselineY -= lineHeight;
    }
    if (baselineY < 8) {
      truncated = true;
      break;
    }

    for (const stroke of glyph.strokes) {
      strokes.push({
        id: makeId(),
        points: stroke.points.map((point) =>
          placeOnBaseline(point, xMm, baselineY, glyph.baselineMm),
        ),
      });
    }
    xMm += glyph.widthMm + profile.letterSpacingMm;
  }

  return { strokes, missing, truncated };
}

function placeOnBaseline(
  point: PointMm,
  originX: number,
  baselineY: number,
  glyphBaseline: number,
): PointMm {
  return {
    xMm: originX + point.xMm,
    yMm: baselineY + (point.yMm - glyphBaseline),
  };
}

function strokeHitsBox(stroke: Stroke, box: CaptureBox): boolean {
  return stroke.points.some(
    (point) =>
      point.xMm >= box.xMm &&
      point.xMm <= box.xMm + box.widthMm &&
      point.yMm >= box.yMm &&
      point.yMm <= box.yMm + box.heightMm,
  );
}

function strokeBounds(strokes: Stroke[]): {
  minX: number;
  maxX: number;
} | null {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  for (const stroke of strokes) {
    for (const point of stroke.points) {
      minX = Math.min(minX, point.xMm);
      maxX = Math.max(maxX, point.xMm);
    }
  }
  if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
    return null;
  }
  return { minX, maxX };
}

function averageAdvance(profile: HandProfile): number {
  const widths = Object.values(profile.glyphs)
    .filter((glyph) => glyph.key.length === 1)
    .map((glyph) => glyph.widthMm);
  if (widths.length === 0) {
    return 0;
  }
  return widths.reduce((sum, width) => sum + width, 0) / widths.length;
}
