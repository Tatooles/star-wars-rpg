type WorldPosition = {
  x: number;
  y: number;
  z: number;
};

export const RAISED_PLATFORM = {
  centerX: 0,
  centerY: 0.15,
  centerZ: -22,
  topRadius: 8.6,
  bottomRadius: 9.1,
  height: 0.5,
  surfaceY: 0.4,
} as const;

const PATH_SURFACE_Y = 0.04;
const INDICATOR_CLEARANCE = 0.02;

function getOutpostGroundHeight(x: number, z: number) {
  const distanceFromPlatformCenter = Math.hypot(
    x - RAISED_PLATFORM.centerX,
    z - RAISED_PLATFORM.centerZ,
  );

  return distanceFromPlatformCenter <= RAISED_PLATFORM.topRadius
    ? RAISED_PLATFORM.surfaceY
    : PATH_SURFACE_Y;
}

export function getEnemyIndicatorGroundOffset(position: WorldPosition) {
  return getOutpostGroundHeight(position.x, position.z) + INDICATOR_CLEARANCE - position.y;
}
