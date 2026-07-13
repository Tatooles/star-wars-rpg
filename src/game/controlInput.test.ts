import { describe, expect, it } from "vitest";
import { createControlInput } from "./controlInput";

describe("control input", () => {
  it("combines analog touch axes with edge-triggered touch actions", () => {
    const input = createControlInput();

    input.setJoystick({ move: 0.6, turn: -0.35 });
    input.setTouchAction("attack", true);
    input.setTouchAction("attack", true);

    expect(input.state.moveAxis).toBe(0.6);
    expect(input.state.turnAxis).toBe(-0.35);
    expect(input.state.attack).toBe(true);
    expect(input.state.attackPresses).toBe(1);

    input.setTouchAction("attack", false);
    input.setTouchAction("attack", true);
    expect(input.state.attackPresses).toBe(2);
  });

  it("releases interrupted touch input without clearing held keyboard input", () => {
    const input = createControlInput();

    input.setKeyboardAction("block", true);
    input.setJoystick({ move: 1, turn: 0.5 });
    input.setTouchAction("block", true);
    input.releaseTouch();

    expect(input.state.moveAxis).toBe(0);
    expect(input.state.turnAxis).toBe(0);
    expect(input.state.block).toBe(true);

    input.releaseAll();
    expect(input.state.block).toBe(false);
  });

  it("counts dodge, lock, and interact once per touch press", () => {
    const input = createControlInput();

    input.setTouchAction("dodge", true);
    input.setTouchAction("lock", true);
    input.setTouchAction("interact", true);

    expect(input.state.dodgePresses).toBe(1);
    expect(input.state.lockPresses).toBe(1);
    expect(input.state.interactPresses).toBe(1);
  });
});
