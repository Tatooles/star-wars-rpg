export const PLAYER_TUNING = {
  runSpeed: 7.2,
  jumpSpeed: 7.4,
  dodgeSpeed: 16,
  dodgeDuration: 0.24,
  dodgeCooldown: 0.85,
  attackDurations: [0.46, 0.5, 0.62] as const,
  attackDamage: 34,
  attackHitWindow: { start: 0.14, end: 0.8 },
  attackReach: 1.65,
  attackHalfExtents: { width: 1.05, height: 0.82, depth: 1.65 },
  knockbackRecoveryMs: 320,
} as const;

export const B1_TUNING = {
  initialFireDelay: 1.8,
  initialFireDelayStep: 0.55,
  telegraphDuration: 0.42,
  fireCooldown: 3.6,
  fireCooldownVariance: 0.8,
  hitRecovery: 0.24,
  retreatDistance: 4.6,
  pursueDistance: 10,
} as const;

export const B2_TUNING = {
  initialBurstCooldown: 1.4,
  burstCooldown: 3.4,
  burstShots: 3,
  burstSpacing: 0.22,
  meleeCooldown: 2.35,
  meleeRange: 2.7,
  meleeDamage: 10,
  reflectedDamageCap: 55,
  hitRecovery: 0.3,
} as const;

export const PROJECTILE_TUNING = {
  speed: 13,
  reflectedSpeed: 18,
  lifetime: 5,
  reflectedFallbackHitDelay: 0.22,
  reflectedDamage: 100,
  b1Damage: 2,
  b2Damage: 4,
} as const;
