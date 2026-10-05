import { describe, expect, it } from "vitest";
import { cellCentersBetween, snapToCellCenter, snapToIntersection } from "./grid";

describe("grid snapping", () => {
  it("snaps to graph-paper intersections", () => {
    expect(snapToIntersection(7.4, 12.6, 5)).toEqual({ xMm: 5, yMm: 15 });
  });

  it("snaps to the filled cell centre", () => {
    expect(snapToCellCenter(7.4, 12.6, 5)).toEqual({ xMm: 7.5, yMm: 12.5 });
  });

  it("joins painted cells through their centres", () => {
    const points = cellCentersBetween({ col: 0, row: 0 }, { col: 2, row: 0 }, 5);
    expect(points).toEqual([
      { xMm: 2.5, yMm: 2.5 },
      { xMm: 7.5, yMm: 2.5 },
      { xMm: 12.5, yMm: 2.5 },
    ]);
  });
});
