import { describe, expect, it } from "vitest";
import { createSession, sessionReducer } from "./session";

describe("game session", () => {
  it("starts a clean mission run", () => {
    const dirty = {
      ...createSession("complete", 4),
      player: { ...createSession().player, health: 12, xp: 175, level: 3 as const },
      enemiesDefeated: 9,
      beaconDisabled: true,
    };

    const started = sessionReducer(dirty, { type: "START_MISSION" });

    expect(started.screen).toBe("playing");
    expect(started.runId).toBe(5);
    expect(started.player).toEqual({
      health: 100,
      maxHealth: 100,
      level: 1,
      xp: 0,
      damageMultiplier: 1,
    });
    expect(started.enemies).toHaveLength(1);
    expect(started.enemies[0]?.alive).toBe(true);
    expect(started.enemiesDefeated).toBe(0);
    expect(started.beaconDisabled).toBe(false);
  });

  it("counts an enemy defeat exactly once and clears its lock", () => {
    const playing = {
      ...createSession("playing"),
      lockedTargetId: "b1-scout",
    };

    const defeated = sessionReducer(playing, {
      type: "DAMAGE_ENEMY",
      enemyId: "b1-scout",
      amount: 100,
    });
    const duplicate = sessionReducer(defeated, {
      type: "DAMAGE_ENEMY",
      enemyId: "b1-scout",
      amount: 100,
    });

    expect(defeated.enemies[0]).toMatchObject({ health: 0, alive: false });
    expect(defeated.enemiesDefeated).toBe(1);
    expect(defeated.lockedTargetId).toBeNull();
    expect(duplicate).toBe(defeated);
  });

  it("defeats Anakin at zero health", () => {
    const defeated = sessionReducer(createSession("playing"), {
      type: "DAMAGE_PLAYER",
      amount: 100,
    });

    expect(defeated.player.health).toBe(0);
    expect(defeated.screen).toBe("defeated");
  });
});
