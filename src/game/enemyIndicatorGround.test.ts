import { describe, expect, it } from "vitest";
import { getEnemyIndicatorGroundOffset } from "./outpostGround";

describe("enemy focus indicator ground placement", () => {
  it("sits just above the normal path", () => {
    expect(getEnemyIndicatorGroundOffset({ x: 0, y: 1.2, z: 0 })).toBeCloseTo(-1.14);
  });

  it("moves above the raised central platform", () => {
    expect(getEnemyIndicatorGroundOffset({ x: 0, y: 1.2, z: -22 })).toBeCloseTo(-0.78);
  });

  it("returns to path height after leaving the raised platform", () => {
    expect(getEnemyIndicatorGroundOffset({ x: 4.2, y: 1.2, z: -12 })).toBeCloseTo(-1.14);
  });
});
