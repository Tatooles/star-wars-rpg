import { PLAYER_TUNING } from "./combatTuning";

export type AnakinAnimationState = {
  moving: boolean;
  attacking: boolean;
  blocking: boolean;
  comboStep?: number;
  backpedaling?: boolean;
};

export const visualAssetManifest = {
  anakin: {
    runtimePath: "/assets/models/anakin.glb",
    sourceUrl: "https://static.makehumancommunity.org/about/license.html",
    license: "CC0-1.0",
  },
  b1: {
    runtimePath: "/assets/models/b1.glb",
    sourceUrl: "project-authored",
    license: "Original project asset",
  },
} as const;

export const B1_GROUNDING = {
  bodyY: 0.7,
  modelOffsetY: -0.745,
} as const;

export function anakinAttackTimeScale(comboStep: number, clipDuration: number) {
  const duration = PLAYER_TUNING.attackDurations[comboStep] ?? PLAYER_TUNING.attackDurations[0];
  return clipDuration / duration;
}

export function selectAnakinClip(state: AnakinAnimationState) {
  if (state.blocking) return "Block";
  if (state.attacking) return "Attack1";
  if (state.moving && state.backpedaling) return "Backpedal";
  if (state.moving) return "Run";
  return "Idle";
}

export function selectAnakinActionKey(state: AnakinAnimationState) {
  const clip = selectAnakinClip(state);
  return clip === "Attack1" ? `${clip}:${state.comboStep ?? 0}` : clip;
}

export function anakinLocomotionTimeScale(speed: number) {
  return Math.max(0, Math.min(1.25, speed / 6.8));
}

export function shouldAttemptSaberHit(state: {
  attacking: boolean;
  progress: number;
  attempts: number;
  alreadyHit: boolean;
}) {
  const attemptThresholds = [0.3, 0.5, 0.7] as const;
  const nextThreshold = attemptThresholds[state.attempts];
  return state.attacking &&
    !state.alreadyHit &&
    nextThreshold !== undefined &&
    state.progress >= nextThreshold &&
    state.progress <= PLAYER_TUNING.attackHitWindow.end;
}

export function shouldCrossfadeAnakinAction(previousClip: string | undefined, nextClip: string) {
  return previousClip !== undefined && previousClip !== nextClip;
}

export function selectB1Clip(state: { moving: boolean; firing: boolean; hit: boolean }) {
  if (state.hit) return "Hit";
  if (state.firing) return "Fire";
  if (state.moving) return "Walk";
  return "Idle";
}
