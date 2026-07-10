export type CameraTargetPosition = {
  x: number;
  y: number;
  z: number;
};

export function resolveCameraLockPosition<T extends CameraTargetPosition>(
  lockedTargetId: string | null,
  positionSnapshot: T | null,
): T | null {
  return lockedTargetId ? positionSnapshot : null;
}
