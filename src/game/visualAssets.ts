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

export function selectB1Clip(state: { moving: boolean; firing: boolean; hit: boolean }) {
  if (state.hit) return "Hit";
  if (state.firing) return "Fire";
  if (state.moving) return "Walk";
  return "Idle";
}
