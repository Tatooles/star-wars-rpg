export const CAMERA_TURN_RATE_RADIANS = (120 * Math.PI) / 180;
export const BACKPEDAL_SPEED_MULTIPLIER = 0.75;

type CameraYawInput = {
  cameraYaw: number;
  deltaSeconds: number;
  turnLeft: boolean;
  turnRight: boolean;
  targetLocked: boolean;
};

type LongitudinalMovementInput = {
  cameraYaw: number;
  forward: boolean;
  backward: boolean;
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
  turnLeft,
  turnRight,
  targetLocked,
}: CameraYawInput) {
  if (targetLocked) return cameraYaw;
  const turnDirection = Number(turnLeft) - Number(turnRight);
  return cameraYaw + turnDirection * CAMERA_TURN_RATE_RADIANS * deltaSeconds;
}

export function resolveLongitudinalMovement({
  cameraYaw,
  forward,
  backward,
}: LongitudinalMovementInput): LongitudinalMovement {
  const movementDirection = Number(forward) - Number(backward);
  if (movementDirection === 0) {
    return { directionX: 0, directionZ: 0, speedMultiplier: 0 };
  }

  const direction = Math.sign(movementDirection);
  return {
    directionX: cleanComponent(Math.sin(cameraYaw) * direction),
    directionZ: cleanComponent(Math.cos(cameraYaw) * direction),
    speedMultiplier: direction > 0 ? 1 : BACKPEDAL_SPEED_MULTIPLIER,
  };
}

export function resolveMovementFrame({
  cameraYaw,
  playerPosition,
  lockedTargetPosition,
  forward,
  backward,
}: MovementFrameInput): MovementFrame {
  const facingYaw = lockedTargetPosition
    ? Math.atan2(
      lockedTargetPosition.x - playerPosition.x,
      lockedTargetPosition.z - playerPosition.z,
    )
    : cameraYaw;
  return {
    facingYaw,
    ...resolveLongitudinalMovement({ cameraYaw: facingYaw, forward, backward }),
  };
}

function cleanComponent(value: number) {
  return Math.abs(value) < 1e-12 ? 0 : value;
}
