const JOYSTICK_DEAD_ZONE = 0.15;

type Point = {
  x: number;
  y: number;
};

export type JoystickAxes = {
  move: number;
  turn: number;
};

export function resolveJoystickAxes(offset: Point, radius: number): JoystickAxes {
  if (radius <= 0) return { move: 0, turn: 0 };

  const rawX = offset.x / radius;
  const rawY = offset.y / radius;
  const rawMagnitude = Math.hypot(rawX, rawY);
  if (rawMagnitude <= JOYSTICK_DEAD_ZONE) return { move: 0, turn: 0 };

  const clampedMagnitude = Math.min(1, rawMagnitude);
  const normalizedMagnitude = Math.min(
    1,
    (clampedMagnitude - JOYSTICK_DEAD_ZONE) / (1 - JOYSTICK_DEAD_ZONE),
  );
  const directionX = rawX / rawMagnitude;
  const directionY = rawY / rawMagnitude;

  return {
    move: cleanAxis(-directionY * normalizedMagnitude),
    turn: cleanAxis(-directionX * normalizedMagnitude),
  };
}

function cleanAxis(value: number) {
  return Math.abs(value) < 1e-12 ? 0 : value;
}
