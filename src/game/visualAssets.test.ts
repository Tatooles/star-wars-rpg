import { describe, expect, it } from "vitest";
import {
  anakinLocomotionTimeScale,
  selectAnakinActionKey,
  selectAnakinClip,
  selectB1Clip,
  visualAssetManifest,
} from "./visualAssets";

describe("visual asset contract", () => {
  it("records a local, redistributable source and runtime path for each slice asset", () => {
    expect(visualAssetManifest.anakin.runtimePath).toBe("/assets/models/anakin.glb");
    expect(visualAssetManifest.b1.runtimePath).toBe("/assets/models/b1.glb");
    expect(visualAssetManifest.anakin.sourceUrl).toMatch(/^https:\/\//);
    expect(visualAssetManifest.b1.sourceUrl).toBe("project-authored");
    for (const asset of Object.values(visualAssetManifest)) {
      expect(asset.license).toMatch(/CC0|Original/);
    }
  });
});

describe("B1 animation selection", () => {
  it("prioritizes hit, then fire, then walk, then idle", () => {
    expect(selectB1Clip({ moving: true, firing: true, hit: true })).toBe("Hit");
    expect(selectB1Clip({ moving: true, firing: true, hit: false })).toBe("Fire");
    expect(selectB1Clip({ moving: true, firing: false, hit: false })).toBe("Walk");
    expect(selectB1Clip({ moving: false, firing: false, hit: false })).toBe("Idle");
  });
});

describe("Anakin locomotion timing", () => {
  it("matches animation playback to forward and backpedal speed", () => {
    expect(anakinLocomotionTimeScale(6.8)).toBe(1);
    expect(anakinLocomotionTimeScale(3.4)).toBe(0.5);
    expect(anakinLocomotionTimeScale(0)).toBe(0);
  });
});

describe("Anakin animation selection", () => {
  it("prioritizes block, then attack, then movement, then idle", () => {
    expect(selectAnakinClip({ moving: true, attacking: true, blocking: true })).toBe("Block");
    expect(selectAnakinClip({ moving: true, attacking: true, blocking: false })).toBe("Attack1");
    expect(selectAnakinClip({ moving: true, attacking: false, blocking: false, backpedaling: true })).toBe("Backpedal");
    expect(selectAnakinClip({ moving: true, attacking: false, blocking: false })).toBe("Run");
    expect(selectAnakinClip({ moving: false, attacking: false, blocking: false })).toBe("Idle");
  });

  it("restarts the skeletal attack action for each combo step", () => {
    expect(selectAnakinActionKey({ moving: false, attacking: true, blocking: false, comboStep: 0 })).toBe("Attack1:0");
    expect(selectAnakinActionKey({ moving: false, attacking: true, blocking: false, comboStep: 1 })).toBe("Attack1:1");
  });
});
