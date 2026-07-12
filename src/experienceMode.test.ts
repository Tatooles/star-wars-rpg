import { describe, expect, it } from "vitest";
import {
  isPortraitViewport,
  resolveInitialInputMode,
  resolveInputModeAfterPointer,
} from "./experienceMode";

describe("experience mode", () => {
  it("starts touch-first devices in touch mode without rejecting fine-pointer hybrids", () => {
    expect(resolveInitialInputMode({ coarsePointer: true, maxTouchPoints: 5 })).toBe("touch");
    expect(resolveInitialInputMode({ coarsePointer: false, maxTouchPoints: 5 })).toBe("desktop");
    expect(resolveInitialInputMode({ coarsePointer: true, maxTouchPoints: 0 })).toBe("desktop");
  });

  it("lets recent pointer input switch a hybrid device interface", () => {
    expect(resolveInputModeAfterPointer("desktop", "touch")).toBe("touch");
    expect(resolveInputModeAfterPointer("touch", "mouse")).toBe("desktop");
    expect(resolveInputModeAfterPointer("touch", "pen")).toBe("touch");
  });

  it("requires landscape only when height exceeds width", () => {
    expect(isPortraitViewport(390, 844)).toBe(true);
    expect(isPortraitViewport(844, 390)).toBe(false);
    expect(isPortraitViewport(600, 600)).toBe(false);
  });
});
