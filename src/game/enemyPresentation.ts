// Longer than the longest authored defeat clip (B2: 44 frames at 24 fps).
export const DEFEAT_PRESENTATION_SECONDS = 2;

export function getEnemyPresentation(alive: boolean, defeatedForSeconds: number) {
  if (alive) {
    return {
      animation: null,
      colliderEnabled: true,
      registerTarget: true,
      visible: true,
    } as const;
  }
  return {
    animation: "Defeat",
    colliderEnabled: false,
    registerTarget: false,
    visible: defeatedForSeconds <= DEFEAT_PRESENTATION_SECONDS,
  } as const;
}
