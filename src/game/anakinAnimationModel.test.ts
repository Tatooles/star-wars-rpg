import { describe, expect, it } from "vitest";
import {
  ANAKIN_CLIPS,
  dampWeights,
  isLowerBodyTrack,
  resolveLayerWeights,
  resolveTargetWeights,
  zeroWeights,
  type ClipWeights,
} from "./anakinAnimationModel";

const standing = { locomotion: 0, attacking: false, comboStep: 0, blocking: false, dodging: false };

function total(weights: ClipWeights) {
  return ANAKIN_CLIPS.reduce((sum, clip) => sum + weights[clip], 0);
}

describe("resolveTargetWeights", () => {
  it("picks idle, run, or backpedal from locomotion", () => {
    expect(resolveTargetWeights(standing).Idle).toBe(1);
    expect(resolveTargetWeights({ ...standing, locomotion: 1 }).Run).toBe(1);
    expect(resolveTargetWeights({ ...standing, locomotion: -1 }).Backpedal).toBe(1);
  });

  it("maps combo steps to their attack clips and prioritizes dodge over attacks", () => {
    expect(resolveTargetWeights({ ...standing, attacking: true, comboStep: 2 }).Attack3).toBe(1);
    const dodgeAttack = resolveTargetWeights({ ...standing, attacking: true, dodging: true });
    expect(dodgeAttack.Dodge).toBe(1);
    expect(dodgeAttack.Attack1).toBe(0);
  });
});

describe("resolveLayerWeights", () => {
  it("drives the whole body with an attack while standing", () => {
    const layers = resolveLayerWeights(resolveTargetWeights({ ...standing, attacking: true }));
    expect(layers.upper.Attack1).toBe(1);
    expect(layers.lower.Attack1).toBe(1);
    expect(layers.lower.Idle).toBe(0);
  });

  it("keeps the legs running while the upper body swings", () => {
    const layers = resolveLayerWeights(
      resolveTargetWeights({ ...standing, locomotion: 1, attacking: true, comboStep: 1 }),
    );
    expect(layers.upper.Attack2).toBe(1);
    expect(layers.upper.Run).toBe(0);
    expect(layers.lower.Run).toBe(1);
    expect(layers.lower.Attack2).toBe(0);
  });

  it("lets a dodge own the legs even while moving", () => {
    const layers = resolveLayerWeights(resolveTargetWeights({ ...standing, locomotion: 1, dodging: true }));
    expect(layers.lower.Dodge).toBe(1);
    expect(layers.upper.Dodge).toBe(1);
  });

  it("always sums each layer to one during blends", () => {
    let current = resolveTargetWeights(standing);
    const targets = [
      { ...standing, locomotion: 1 },
      { ...standing, locomotion: 1, attacking: true },
      { ...standing, blocking: true },
      { ...standing, locomotion: -1, dodging: true },
      standing,
    ];
    for (const target of targets) {
      for (let frame = 0; frame < 8; frame += 1) {
        current = dampWeights(current, resolveTargetWeights(target), 1 / 60);
        const layers = resolveLayerWeights(current);
        expect(total(layers.upper)).toBeCloseTo(1, 6);
        expect(total(layers.lower)).toBeCloseTo(1, 6);
      }
    }
  });

  it("falls back to idle when every weight is zero", () => {
    const layers = resolveLayerWeights(zeroWeights());
    expect(layers.upper.Idle).toBe(1);
    expect(layers.lower.Idle).toBe(1);
  });
});

describe("dampWeights", () => {
  it("snaps into an attack faster than it fades out", () => {
    const attackTarget = resolveTargetWeights({ ...standing, attacking: true });
    const rising = dampWeights(resolveTargetWeights(standing), attackTarget, 0.05).Attack1;
    const falling = 1 - dampWeights(attackTarget, resolveTargetWeights(standing), 0.05).Attack1;
    expect(rising).toBeGreaterThan(falling);
  });
});

describe("isLowerBodyTrack", () => {
  it("classifies sanitized bone track names", () => {
    expect(isLowerBodyTrack("thighL.quaternion")).toBe(true);
    expect(isLowerBodyTrack("hips.position")).toBe(true);
    expect(isLowerBodyTrack("upper_armR.quaternion")).toBe(false);
    expect(isLowerBodyTrack("chest.quaternion")).toBe(false);
  });
});
