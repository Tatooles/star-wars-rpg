export const ANAKIN_CLIPS = [
  "Idle",
  "Run",
  "Backpedal",
  "Attack1",
  "Attack2",
  "Attack3",
  "Block",
  "Dodge",
] as const;

export type AnakinClip = (typeof ANAKIN_CLIPS)[number];
export type ClipWeights = Record<AnakinClip, number>;
export type LayerWeights = { upper: ClipWeights; lower: ClipWeights };

export const ATTACK_CLIPS = ["Attack1", "Attack2", "Attack3"] as const;
const LOCOMOTION_CLIPS = ["Idle", "Run", "Backpedal"] as const;
const COMBAT_CLIPS = ["Attack1", "Attack2", "Attack3", "Block", "Dodge"] as const;

// Bones driven by the lower-body layer (names as sanitized by three's GLTFLoader).
const LOWER_BODY_BONES = new Set(["root", "hips", "thighL", "thighR", "shinL", "shinR", "footL", "footR"]);

export type AnimationTargetInput = {
  /** 1 = moving forward, -1 = backpedaling, 0 = standing. */
  locomotion: number;
  attacking: boolean;
  comboStep: number;
  blocking: boolean;
  dodging: boolean;
};

export function zeroWeights(): ClipWeights {
  return Object.fromEntries(ANAKIN_CLIPS.map((clip) => [clip, 0])) as ClipWeights;
}

export function resolveTargetWeights(input: AnimationTargetInput): ClipWeights {
  const weights = zeroWeights();
  if (input.locomotion > 0) weights.Run = 1;
  else if (input.locomotion < 0) weights.Backpedal = 1;
  else weights.Idle = 1;

  if (input.dodging) weights.Dodge = 1;
  else if (input.attacking) weights[ATTACK_CLIPS[input.comboStep] ?? "Attack1"] = 1;
  else if (input.blocking) weights.Block = 1;
  return weights;
}

const BLEND_IN_RATE: Partial<Record<AnakinClip, number>> = {
  Attack1: 26,
  Attack2: 26,
  Attack3: 26,
  Dodge: 30,
  Block: 18,
};
const BLEND_OUT_RATE: Partial<Record<AnakinClip, number>> = {
  Attack1: 12,
  Attack2: 12,
  Attack3: 12,
  Dodge: 14,
  Block: 14,
};
const LOCOMOTION_RATE = 10;

/** Exponentially approaches the target weights; combat clips snap in faster than they fade out. */
export function dampWeights(current: ClipWeights, target: ClipWeights, delta: number): ClipWeights {
  const next = zeroWeights();
  for (const clip of ANAKIN_CLIPS) {
    const rising = target[clip] > current[clip];
    const rate = (rising ? BLEND_IN_RATE[clip] : BLEND_OUT_RATE[clip]) ?? LOCOMOTION_RATE;
    next[clip] = current[clip] + (target[clip] - current[clip]) * (1 - Math.exp(-rate * delta));
  }
  return next;
}

/**
 * Splits blended clip weights into an upper-body and a lower-body layer whose
 * weights each sum to 1, so no bone ever falls back to the bind pose.
 * Attacks and blocks drive the legs only while standing; dodges always do.
 */
export function resolveLayerWeights(blend: ClipWeights): LayerWeights {
  const upper = zeroWeights();
  const lower = zeroWeights();

  const locomotionTotal = LOCOMOTION_CLIPS.reduce((sum, clip) => sum + blend[clip], 0);
  const locomotionShare = (clip: AnakinClip) =>
    locomotionTotal > 1e-6 ? blend[clip] / locomotionTotal : clip === "Idle" ? 1 : 0;
  const moving = locomotionShare("Run") + locomotionShare("Backpedal");

  const combatTotal = COMBAT_CLIPS.reduce((sum, clip) => sum + blend[clip], 0);
  const combatScale = combatTotal > 1 ? 1 / combatTotal : 1;

  let upperCombat = 0;
  let lowerCombat = 0;
  for (const clip of COMBAT_CLIPS) {
    const weight = blend[clip] * combatScale;
    upper[clip] = weight;
    lower[clip] = clip === "Dodge" ? weight : weight * (1 - moving);
    upperCombat += upper[clip];
    lowerCombat += lower[clip];
  }
  for (const clip of LOCOMOTION_CLIPS) {
    upper[clip] = Math.max(0, 1 - upperCombat) * locomotionShare(clip);
    lower[clip] = Math.max(0, 1 - lowerCombat) * locomotionShare(clip);
  }
  return { upper, lower };
}

export function isLowerBodyTrack(trackName: string) {
  return LOWER_BODY_BONES.has(trackName.split(".")[0]);
}
