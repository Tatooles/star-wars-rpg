import { describe, expect, it } from "vitest";
import { resolveCameraLockPosition } from "./cameraTarget";

describe("camera lock target", () => {
  it("ignores a stale position snapshot after the target lock is cleared", () => {
    const stalePosition = { x: 3, y: 1.2, z: 8.5 };

    expect(resolveCameraLockPosition(null, stalePosition)).toBeNull();
  });

  it("uses the safe position snapshot while the target remains locked", () => {
    const position = { x: 3, y: 1.2, z: 8.5 };

    expect(resolveCameraLockPosition("b1-1", position)).toBe(position);
  });
});
