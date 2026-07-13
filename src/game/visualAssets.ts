export type AnakinAnimationState = {
  moving: boolean;
  attacking: boolean;
  blocking: boolean;
  comboStep?: number;
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
  if (state.moving) return "Run";
  return "Idle";
}

export function selectAnakinActionKey(state: AnakinAnimationState) {
  const clip = selectAnakinClip(state);
  return clip === "Attack1" ? `${clip}:${state.comboStep ?? 0}` : clip;
}
