import { describe, expect, it } from "vitest";
import {
  ANAKIN_CLIPS,
  B1_CLIPS,
  B2_CLIPS,
  GAME_ASSET_PATHS,
} from "./assetManifest";

describe("game asset contract", () => {
  it("uses only local model paths", () => {
    expect(GAME_ASSET_PATHS).toEqual([
      "/assets/models/anakin.glb",
      "/assets/models/b1.glb",
      "/assets/models/b2.glb",
      "/assets/models/outpost-kit.glb",
      "/assets/models/beacon.glb",
    ]);
    expect(GAME_ASSET_PATHS.every((path) => path.startsWith("/assets/models/"))).toBe(true);
  });

  it("keeps the approved character clip names stable", () => {
    expect(ANAKIN_CLIPS).toEqual([
      "Idle", "Run", "Backpedal", "Attack1", "Attack2", "Attack3",
      "Block", "Dodge", "Hit", "Defeat", "Interact",
    ]);
    expect(B1_CLIPS).toEqual(["Idle", "Move", "Fire", "Hit", "Defeat"]);
    expect(B2_CLIPS).toEqual(["Idle", "Move", "BurstFire", "Melee", "Hit", "Defeat"]);
  });
});
