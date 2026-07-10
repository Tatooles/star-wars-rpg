import { describe, expect, it } from "vitest";
import { calculateFps } from "./fps";

describe("FPS sampling", () => {
  it("reports frames per second across the measured interval", () => {
    expect(calculateFps(30, 500)).toBe(60);
  });

  it("rounds fractional samples for a stable counter display", () => {
    expect(calculateFps(29, 500)).toBe(58);
    expect(calculateFps(30, 510)).toBe(59);
  });

  it("returns zero until a valid interval has been measured", () => {
    expect(calculateFps(0, 500)).toBe(0);
    expect(calculateFps(30, 0)).toBe(0);
  });
});
