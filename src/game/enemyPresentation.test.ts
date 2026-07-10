import { describe, expect, it } from "vitest";
import {
  DEFEAT_PRESENTATION_SECONDS,
  getEnemyPresentation,
} from "./enemyPresentation";

describe("enemy defeat presentation", () => {
  it("removes gameplay participation immediately but keeps the defeat visible", () => {
    expect(getEnemyPresentation(false, 0)).toEqual({
      animation: "Defeat",
      colliderEnabled: false,
      registerTarget: false,
      visible: true,
    });
    expect(getEnemyPresentation(false, DEFEAT_PRESENTATION_SECONDS + 0.01).visible).toBe(false);
  });

  it("keeps living enemies interactive", () => {
    expect(getEnemyPresentation(true, 99)).toEqual({
      animation: null,
      colliderEnabled: true,
      registerTarget: true,
      visible: true,
    });
  });
});
