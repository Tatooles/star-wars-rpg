import { describe, expect, it } from "vitest";
import { resolveJediClip, type CombatPose } from "./jediAnimation";

const idle: CombatPose = { attacking: false, attackProgress: 0, comboStep: 0, blocking: false, dodging: false };
describe("Jedi animation selection", () => {
  it("uses locomotion only when the player is actually moving", () => {
    expect(resolveJediClip(false, idle)).toBe("Idle");
    expect(resolveJediClip(true, idle)).toBe("Run");
  });
  it("maps each gameplay combo step to its corresponding baked attack", () => {
    expect([0, 1, 2].map(comboStep => resolveJediClip(true, { ...idle, attacking: true, comboStep })))
      .toEqual(["Attack1", "Attack2", "Attack3"]);
  });
  it("prioritizes an evasive dodge, then attacks, then the block over locomotion", () => {
    expect(resolveJediClip(true, { ...idle, attacking: true, blocking: true, dodging: true })).toBe("Dodge");
    expect(resolveJediClip(true, { ...idle, attacking: true, blocking: true })).toBe("Attack1");
    expect(resolveJediClip(true, { ...idle, blocking: true })).toBe("Block");
  });
});
