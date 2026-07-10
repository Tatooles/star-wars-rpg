import { describe, expect, it } from "vitest";
import { getActiveBoss } from "./bossHudModel";
import { B2_TUNING } from "./combatTuning";
import { createSession, sessionReducer } from "./session";

describe("boss HUD visibility", () => {
  it("stays hidden before the boss encounter begins", () => {
    expect(getActiveBoss(createSession("playing"))).toBeNull();
  });

  it("shows the living guardian during the boss encounter", () => {
    const session = { ...createSession("playing"), activeEncounter: 3 as const };

    expect(getActiveBoss(session)).toMatchObject({
      id: "b2-guardian",
      health: B2_TUNING.maxHealth,
      maxHealth: B2_TUNING.maxHealth,
    });
  });

  it("hides after the guardian is defeated", () => {
    const session = { ...createSession("playing"), activeEncounter: 3 as const };
    const defeated = sessionReducer(session, {
      type: "DAMAGE_ENEMY",
      enemyId: "b2-guardian",
      amount: 999,
    });

    expect(getActiveBoss(defeated)).toBeNull();
  });
});
