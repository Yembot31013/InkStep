import { describe, expect, it } from "vitest";
import { getPaperSize } from "./paper";
import {
  captureBoxOnPaper,
  composeHandwriting,
  createEmptyProfile,
  extractGlyph,
  tokenizeHandwriting,
  withGlyph,
} from "./handwriting";

describe("tokenizeHandwriting", () => {
  it("prefers a saved word over individual letters", () => {
    expect(tokenizeHandwriting("the cat", new Set(["the", "t", "h", "e", "c", "a"]))).toEqual([
      "the",
      " ",
      "c",
      "a",
      "t",
    ]);
  });

  it("keeps punctuation and newlines as tokens", () => {
    expect(tokenizeHandwriting("Hi,\nyou", new Set(["H", "i", ",", "y", "o", "u"]))).toEqual([
      "H",
      "i",
      ",",
      "\n",
      "y",
      "o",
      "u",
    ]);
  });
});

describe("captureBoxOnPaper", () => {
  it("places a letter box on the page and a wider word box", () => {
    const a4 = getPaperSize("a4");
    const letter = captureBoxOnPaper(a4, "letter");
    const word = captureBoxOnPaper(a4, "word");
    expect(letter.widthMm).toBeLessThan(word.widthMm);
    expect(letter.xMm + letter.widthMm).toBeLessThanOrEqual(a4.widthMm);
    expect(word.xMm + word.widthMm).toBeLessThanOrEqual(a4.widthMm);
    expect(letter.baselineMm).toBeGreaterThan(0);
    expect(letter.baselineMm).toBeLessThan(letter.heightMm);
  });
});

describe("extractGlyph", () => {
  it("keeps ink that sits in the box and measures advance from the ink", () => {
    const box = {
      xMm: 10,
      yMm: 20,
      widthMm: 40,
      heightMm: 48,
      baselineMm: 13,
    };
    const glyph = extractGlyph(
      [
        {
          id: "s1",
          points: [
            { xMm: 18, yMm: 36 },
            { xMm: 28, yMm: 40 },
          ],
        },
        {
          id: "outside",
          points: [
            { xMm: 90, yMm: 90 },
            { xMm: 96, yMm: 94 },
          ],
        },
      ],
      box,
      "a",
      () => "g1",
    );
    expect(glyph).not.toBeNull();
    expect(glyph?.key).toBe("a");
    expect(glyph?.strokes).toHaveLength(1);
    expect(glyph?.widthMm).toBeGreaterThan(9);
    expect(glyph?.widthMm).toBeLessThan(20);
    const first = glyph?.strokes[0]?.points[0];
    expect(first?.yMm).toBeCloseTo(16);
  });

  it("returns null when no stroke meets the box", () => {
    const box = {
      xMm: 0,
      yMm: 0,
      widthMm: 20,
      heightMm: 20,
      baselineMm: 5,
    };
    expect(
      extractGlyph(
        [{ id: "miss", points: [{ xMm: 50, yMm: 50 }, { xMm: 51, yMm: 51 }] }],
        box,
        "b",
        () => "x",
      ),
    ).toBeNull();
  });
});

describe("composeHandwriting", () => {
  it("places the next letter to the right on a shared baseline", () => {
    const profile = profileWithLetters();
    const paper = {
      id: "square",
      name: "Square",
      widthMm: 200,
      heightMm: 200,
    };
    const result = composeHandwriting(profile, "ab", paper, () => "out");
    expect(result.missing).toEqual([]);
    expect(result.strokes.length).toBe(2);
    const a = result.strokes[0]?.points[0];
    const b = result.strokes[1]?.points[0];
    expect(b?.xMm ?? 0).toBeGreaterThan(a?.xMm ?? 0);
    expect(b?.yMm).toBeCloseTo(a?.yMm ?? 0);
  });

  it("uses a word sample instead of spelling it with letters", () => {
    const profile = withGlyph(profileWithLetters(), {
      key: "the",
      widthMm: 24,
      heightMm: 48,
      baselineMm: 13,
      strokes: [
        {
          id: "word",
          points: [
            { xMm: 0, yMm: 13 },
            { xMm: 24, yMm: 13 },
          ],
        },
      ],
    });
    const paper = getPaperSize("a4");
    const result = composeHandwriting(profile, "the", paper, () => "w");
    expect(result.strokes).toHaveLength(1);
    expect(result.strokes[0]?.points.at(-1)?.xMm).toBeGreaterThan(20);
  });

  it("reports missing glyphs and still writes the rest", () => {
    const profile = profileWithLetters();
    const result = composeHandwriting(
      profile,
      "az",
      { id: "s", name: "S", widthMm: 200, heightMm: 200 },
      () => "m",
    );
    expect(result.missing).toContain("z");
    expect(result.strokes).toHaveLength(1);
  });

  it("wraps to a new line when the row would leave the paper", () => {
    const profile = profileWithLetters();
    const paper = {
      id: "narrow",
      name: "Narrow",
      widthMm: 40,
      heightMm: 200,
    };
    const result = composeHandwriting(profile, "aaa", paper, () => "wrap");
    const ys = result.strokes.map((stroke) => stroke.points[0]?.yMm ?? 0);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(10);
    expect(result.truncated).toBe(false);
  });

  it("flags text that runs off the bottom of the page", () => {
    const profile = profileWithLetters();
    const result = composeHandwriting(
      profile,
      "aaaaaaaaaa",
      { id: "tiny", name: "Tiny", widthMm: 40, heightMm: 40 },
      () => "cut",
    );
    expect(result.truncated).toBe(true);
  });
});

function letterGlyph(key: string, endX: number, endY: number) {
  return {
    key,
    widthMm: 10,
    heightMm: 48,
    baselineMm: 13,
    strokes: [
      {
        id: key,
        points: [
          { xMm: 0, yMm: 13 },
          { xMm: endX, yMm: endY },
        ],
      },
    ],
  };
}

function profileWithLetters() {
  return withGlyph(
    withGlyph(createEmptyProfile("Test hand"), letterGlyph("a", 8, 20)),
    letterGlyph("b", 6, 28),
  );
}
