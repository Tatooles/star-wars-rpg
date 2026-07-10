import { describe, expect, it } from "vitest";
import { getHealthBarLayout } from "./enemyIndicatorModel";

describe("enemy health bar layout", () => {
  it("fills the full track at maximum health", () => {
    expect(getHealthBarLayout(55, 55)).toEqual({ fill: 1, centerX: 0 });
  });

  it("keeps a depleted bar anchored to the left edge", () => {
    expect(getHealthBarLayout(11, 55)).toEqual({ fill: 0.2, centerX: -0.4 });
  });

  it("clamps invalid health values to the visible track", () => {
    expect(getHealthBarLayout(80, 55)).toEqual({ fill: 1, centerX: 0 });
    expect(getHealthBarLayout(-10, 55)).toEqual({ fill: 0, centerX: -0.5 });
    expect(getHealthBarLayout(10, 0)).toEqual({ fill: 0, centerX: -0.5 });
  });
});
