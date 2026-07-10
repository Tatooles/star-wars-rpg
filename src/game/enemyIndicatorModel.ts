export function getHealthBarLayout(health: number, maxHealth: number) {
  const fill = maxHealth > 0
    ? Math.min(1, Math.max(0, health / maxHealth))
    : 0;

  return {
    fill,
    centerX: (fill - 1) / 2,
  };
}
