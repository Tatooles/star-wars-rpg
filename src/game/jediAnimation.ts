/** Clip priority follows the player's existing combat state; attack time remains gameplay-owned. */
export type CombatPose = {
  attacking: boolean;
  attackProgress: number;
  comboStep: number;
  blocking: boolean;
  dodging: boolean;
};

export const JEDI_CLIPS = ["Idle", "Run", "Attack1", "Attack2", "Attack3", "Block", "Dodge"] as const;
export type JediClip = (typeof JEDI_CLIPS)[number];

export function resolveJediClip(moving: boolean, pose: CombatPose): JediClip {
  if (pose.dodging) return "Dodge";
  if (pose.attacking) return pose.comboStep === 1 ? "Attack2" : pose.comboStep === 2 ? "Attack3" : "Attack1";
  if (pose.blocking) return "Block";
  return moving ? "Run" : "Idle";
}
