export const CAMERA_TURN_RATE_RADIANS = (120 * Math.PI) / 180;
export const BACKPEDAL_SPEED_MULTIPLIER = 0.75;

type CameraYawInput = {
  cameraYaw: number;
  deltaSeconds: number;
  turnAxis: number;
  targetLocked: boolean;
};

type LongitudinalMovementInput = {
  cameraYaw: number;
  moveAxis: number;
};

type HorizontalPosition = {
  x: number;
  z: number;
};

type MovementFrameInput = Omit<LongitudinalMovementInput, "cameraYaw"> & {
  cameraYaw: number;
  playerPosition: HorizontalPosition;
  lockedTargetPosition: HorizontalPosition | null;
};

export type LongitudinalMovement = {
  directionX: number;
  directionZ: number;
  speedMultiplier: number;
};

export type MovementFrame = LongitudinalMovement & {
  facingYaw: number;
};

export function advanceCameraYaw({
  cameraYaw,
  deltaSeconds,
  turnAxis,
  targetLocked,
}: CameraYawInput) {
  if (targetLocked) return cameraYaw;
  return cameraYaw + turnAxis * CAMERA_TURN_RATE_RADIANS * deltaSeconds;
}

export function resolveLongitudinalMovement({
  cameraYaw,
  moveAxis,
}: LongitudinalMovementInput): LongitudinalMovement {
  if (moveAxis === 0) {
    return { directionX: 0, directionZ: 0, speedMultiplier: 0 };
  }

  const direction = Math.sign(moveAxis);
  return {
    directionX: cleanComponent(Math.sin(cameraYaw) * direction),
    directionZ: cleanComponent(Math.cos(cameraYaw) * direction),
    speedMultiplier: Math.abs(moveAxis) * (direction > 0 ? 1 : BACKPEDAL_SPEED_MULTIPLIER),
  };
}

export function resolveMovementFrame({
  cameraYaw,
  playerPosition,
  lockedTargetPosition,
  moveAxis,
}: MovementFrameInput): MovementFrame {
  const facingYaw = lockedTargetPosition
    ? Math.atan2(
      lockedTargetPosition.x - playerPosition.x,
      lockedTargetPosition.z - playerPosition.z,
    )
    : cameraYaw;
  return {
    facingYaw,
    ...resolveLongitudinalMovement({ cameraYaw: facingYaw, moveAxis }),
  };
}

function cleanComponent(value: number) {
  return Math.abs(value) < 1e-12 ? 0 : value;
}
