import { describe, expect, it } from "vitest";
import { B2_TUNING, PROJECTILE_TUNING } from "./combatTuning";

describe("enemy combat tuning", () => {
  it("uses the harder enemy damage values", () => {
    expect(PROJECTILE_TUNING.b1Damage).toBe(7);
    expect(PROJECTILE_TUNING.b2Damage).toBe(12);
    expect(B2_TUNING.meleeDamage).toBe(18);
  });
});
