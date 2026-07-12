import { describe, expect, it } from "vitest";
import {
  advanceCameraYaw,
  resolveLongitudinalMovement,
  resolveMovementFrame,
} from "./controlModel";

describe("keyboard control model", () => {
  it("scales movement and camera rotation from normalized analog axes", () => {
    expect(
      advanceCameraYaw({
        cameraYaw: 0,
        deltaSeconds: 0.5,
        turnAxis: 0.5,
        targetLocked: false,
      }),
    ).toBeCloseTo(Math.PI / 6);
    expect(
      resolveLongitudinalMovement({
        cameraYaw: Math.PI / 2,
        moveAxis: 0.5,
      }),
    ).toEqual({ directionX: 1, directionZ: 0, speedMultiplier: 0.5 });
  });

  it("turns left and right at a constant 120 degrees per second", () => {
    expect(
      advanceCameraYaw({
        cameraYaw: 0,
        deltaSeconds: 0.5,
        turnAxis: 1,
        targetLocked: false,
      }),
    ).toBeCloseTo(Math.PI / 3);
    expect(
      advanceCameraYaw({
        cameraYaw: 0,
        deltaSeconds: 0.5,
        turnAxis: -1,
        targetLocked: false,
      }),
    ).toBeCloseTo(-Math.PI / 3);
  });

  it("ignores manual camera turning while target lock is active", () => {
    expect(
      advanceCameraYaw({
        cameraYaw: 1.25,
        deltaSeconds: 1,
        turnAxis: 1,
        targetLocked: true,
      }),
    ).toBe(1.25);
  });

  it("moves forward along camera heading and backpedals at 75 percent speed", () => {
    expect(
      resolveLongitudinalMovement({
        cameraYaw: Math.PI / 2,
        moveAxis: 1,
      }),
    ).toEqual({ directionX: 1, directionZ: 0, speedMultiplier: 1 });
    expect(
      resolveLongitudinalMovement({
        cameraYaw: Math.PI / 2,
        moveAxis: -1,
      }),
    ).toEqual({ directionX: -1, directionZ: 0, speedMultiplier: 0.75 });
  });

  it("does not move when forward and backward are held together", () => {
    expect(
      resolveLongitudinalMovement({
        cameraYaw: 0,
        moveAxis: 0,
      }),
    ).toEqual({ directionX: 0, directionZ: 0, speedMultiplier: 0 });
  });

  it("uses the target heading for forward and backward movement while locked", () => {
    expect(
      resolveMovementFrame({
        cameraYaw: 0,
        playerPosition: { x: 1, z: 2 },
        lockedTargetPosition: { x: 4, z: 2 },
        moveAxis: 1,
      }),
    ).toEqual({
      facingYaw: Math.PI / 2,
      directionX: 1,
      directionZ: 0,
      speedMultiplier: 1,
    });
    expect(
      resolveMovementFrame({
        cameraYaw: 0,
        playerPosition: { x: 1, z: 2 },
        lockedTargetPosition: { x: 4, z: 2 },
        moveAxis: -1,
      }),
    ).toEqual({
      facingYaw: Math.PI / 2,
      directionX: -1,
      directionZ: 0,
      speedMultiplier: 0.75,
    });
  });
});
