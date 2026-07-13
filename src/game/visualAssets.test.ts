import { describe, expect, it } from "vitest";
import {
  anakinLocomotionTimeScale,
  anakinAttackTimeScale,
  B1_GROUNDING,
  selectAnakinActionKey,
  selectAnakinClip,
  selectB1Clip,
  shouldAttemptSaberHit,
  shouldCrossfadeAnakinAction,
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

describe("saber hit query timing", () => {
  it("bounds target queries while allowing later retries after a miss", () => {
    expect(shouldAttemptSaberHit({ attacking: true, progress: 0.3, attempts: 0, alreadyHit: false })).toBe(true);
    expect(shouldAttemptSaberHit({ attacking: true, progress: 0.4, attempts: 1, alreadyHit: false })).toBe(false);
    expect(shouldAttemptSaberHit({ attacking: true, progress: 0.5, attempts: 1, alreadyHit: false })).toBe(true);
    expect(shouldAttemptSaberHit({ attacking: true, progress: 0.7, attempts: 3, alreadyHit: false })).toBe(false);
    expect(shouldAttemptSaberHit({ attacking: true, progress: 0.5, attempts: 1, alreadyHit: true })).toBe(false);
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

describe("B1 grounding", () => {
  it("places both the capsule and model soles on the ground plane", () => {
    const colliderBottom = B1_GROUNDING.bodyY + 0.2 - (0.52 + 0.38);
    const soleBottom = B1_GROUNDING.bodyY + B1_GROUNDING.modelOffsetY + 0.045;
    expect(colliderBottom).toBeCloseTo(0);
    expect(soleBottom).toBeCloseTo(0);
  });
});

describe("Anakin locomotion timing", () => {
  it("matches animation playback to forward and backpedal speed", () => {
    expect(anakinLocomotionTimeScale(6.8)).toBe(1);
    expect(anakinLocomotionTimeScale(3.4)).toBe(0.5);
    expect(anakinLocomotionTimeScale(0)).toBe(0);
  });

  it("fits the authored attack clip into the active combo duration", () => {
    expect(anakinAttackTimeScale(0, 0.8)).toBeCloseTo(0.8 / 0.46);
    expect(anakinAttackTimeScale(2, 0.8)).toBeCloseTo(0.8 / 0.62);
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

  it("does not crossfade an attack action into itself during a combo", () => {
    expect(shouldCrossfadeAnakinAction("Attack1", "Attack1")).toBe(false);
    expect(shouldCrossfadeAnakinAction("Run", "Attack1")).toBe(true);
  });
});
