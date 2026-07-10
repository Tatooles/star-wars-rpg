export const GAME_ASSETS = {
  anakin: "/assets/models/anakin.glb",
  b1: "/assets/models/b1.glb",
  b2: "/assets/models/b2.glb",
  outpost: "/assets/models/outpost-kit.glb",
  beacon: "/assets/models/beacon.glb",
} as const;

export const GAME_ASSET_PATHS = [
  GAME_ASSETS.anakin,
  GAME_ASSETS.b1,
  GAME_ASSETS.b2,
  GAME_ASSETS.outpost,
  GAME_ASSETS.beacon,
] as const;

export const ANAKIN_CLIPS = [
  "Idle", "Run", "Backpedal", "Attack1", "Attack2", "Attack3",
  "Block", "Dodge", "Hit", "Defeat", "Interact",
] as const;
export const B1_CLIPS = ["Idle", "Move", "Fire", "Hit", "Defeat"] as const;
export const B2_CLIPS = ["Idle", "Move", "BurstFire", "Melee", "Hit", "Defeat"] as const;

export type AnakinClip = (typeof ANAKIN_CLIPS)[number];
export type B1Clip = (typeof B1_CLIPS)[number];
export type B2Clip = (typeof B2_CLIPS)[number];
