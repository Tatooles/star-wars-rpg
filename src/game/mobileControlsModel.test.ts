import { describe, expect, it } from "vitest";
import { resolveJoystickAxes } from "./mobileControlsModel";

describe("mobile joystick", () => {
  it("keeps the stick at rest inside its center dead zone", () => {
    expect(resolveJoystickAxes({ x: 3, y: -4 }, 60)).toEqual({ move: 0, turn: 0 });
  });

  it("normalizes movement and turning outside the dead zone", () => {
    const axes = resolveJoystickAxes({ x: 30, y: -45 }, 60);

    expect(axes.turn).toBeCloseTo(-0.49, 2);
    expect(axes.move).toBeCloseTo(0.735, 2);
  });

  it("clamps a dragged thumb to the joystick radius", () => {
    expect(resolveJoystickAxes({ x: -120, y: 0 }, 60)).toEqual({ move: 0, turn: 1 });
    expect(resolveJoystickAxes({ x: 0, y: 120 }, 60)).toEqual({ move: -1, turn: 0 });
  });
});
