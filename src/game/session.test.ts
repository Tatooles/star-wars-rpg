import { describe, expect, it } from "vitest";
import {
  createSession,
  formatMissionTime,
  sessionReducer,
  type GameSession,
} from "./session";

function activeSession(): GameSession {
  return { ...createSession("playing"), activeEncounter: 3 };
}

function defeatEnemy(session: GameSession, enemyId: string) {
  return sessionReducer(session, { type: "DAMAGE_ENEMY", enemyId, amount: 999 });
}

describe("game session", () => {
  it("starts a clean run with eight B1s and one B2", () => {
    const dirty = {
      ...createSession("complete", 4),
      player: { ...createSession().player, health: 12, xp: 300, level: 3 as const },
      enemiesDefeated: 9,
      beaconDisabled: true,
    };

    const started = sessionReducer(dirty, { type: "START_MISSION", nowMs: 1_000 });

    expect(started.screen).toBe("playing");
    expect(started.runId).toBe(5);
    expect(started.player).toEqual({
      health: 100,
      maxHealth: 100,
      level: 1,
      xp: 0,
      damageMultiplier: 1,
      combat: { attacking: false, blocking: false, dodging: false, comboStep: 0 },
    });
    expect(started.enemies.filter((enemy) => enemy.kind === "b1")).toHaveLength(8);
    expect(started.enemies.filter((enemy) => enemy.kind === "b2")).toHaveLength(1);
    expect(started.enemies.filter((enemy) => enemy.kind === "b1").every((enemy) => enemy.maxHealth === 85)).toBe(true);
    expect(started.enemies.find((enemy) => enemy.kind === "b2")?.maxHealth).toBe(340);
    expect(started.enemies.every((enemy) => enemy.alive)).toBe(true);
    expect(started.enemiesDefeated).toBe(0);
    expect(started.beaconDisabled).toBe(false);
  });

  it("awards each kill once and clears a defeated target lock", () => {
    const playing = { ...activeSession(), lockedTargetId: "b1-1" };
    const defeated = defeatEnemy(playing, "b1-1");
    const duplicate = defeatEnemy(defeated, "b1-1");

    expect(defeated.enemies[0]).toMatchObject({ health: 0, alive: false });
    expect(defeated.enemiesDefeated).toBe(1);
    expect(defeated.player.xp).toBe(25);
    expect(defeated.lockedTargetId).toBeNull();
    expect(duplicate).toBe(defeated);
  });

  it("does not let a stale clear remove a newer target lock", () => {
    let session = sessionReducer(activeSession(), { type: "TOGGLE_LOCK", enemyId: "b1-1" });
    session = sessionReducer(session, { type: "TOGGLE_LOCK", enemyId: "b1-2" });

    const afterStaleClear = sessionReducer(session, { type: "CLEAR_LOCK", targetId: "b1-1" });

    expect(afterStaleClear.lockedTargetId).toBe("b1-2");
  });

  it("levels at exactly 75 and 175 XP without a full heal", () => {
    let session = activeSession();
    session = sessionReducer(session, { type: "DAMAGE_PLAYER", amount: 30 });
    session = defeatEnemy(session, "b1-1");
    session = defeatEnemy(session, "b1-2");
    session = defeatEnemy(session, "b1-3");

    expect(session.player).toMatchObject({ xp: 75, level: 2, health: 90, maxHealth: 120, damageMultiplier: 1.15 });

    session = defeatEnemy(session, "b1-4");
    session = defeatEnemy(session, "b1-5");
    session = defeatEnemy(session, "b1-6");
    session = defeatEnemy(session, "b1-7");

    expect(session.player).toMatchObject({ xp: 175, level: 3, health: 110, maxHealth: 140, damageMultiplier: 1.3 });
    expect(session.levelUpCount).toBe(2);
  });

  it("prevents beacon shutdown until the guardian is defeated", () => {
    const blocked = sessionReducer(activeSession(), { type: "DISABLE_BEACON", nowMs: 1_000 });
    expect(blocked.beaconDisabled).toBe(false);

    let cleared = activeSession();
    cleared = defeatEnemy(cleared, "b2-guardian");
    expect(cleared.objective).toBe("Disable the communications beacon");

    const complete = sessionReducer(cleared, { type: "DISABLE_BEACON", nowMs: 2_000 });
    expect(complete.screen).toBe("complete");
    expect(complete.beaconDisabled).toBe(true);
    expect(complete.objective).toBe("Mission complete");
  });

  it("defeats Anakin at zero health", () => {
    const defeated = sessionReducer(createSession("playing"), { type: "DAMAGE_PLAYER", amount: 100 });
    expect(defeated.player.health).toBe(0);
    expect(defeated.screen).toBe("defeated");
  });

  it("keeps authoritative combat state and resets it on pause or restart", () => {
    let session = sessionReducer(createSession("playing"), {
      type: "SET_COMBAT_STATE",
      combat: { attacking: true, blocking: false, dodging: false, comboStep: 2 },
    });

    expect(session.player.combat).toEqual({
      attacking: true,
      blocking: false,
      dodging: false,
      comboStep: 2,
    });

    session = sessionReducer(session, { type: "PAUSE", nowMs: 1_000 });
    expect(session.player.combat).toEqual({
      attacking: false,
      blocking: false,
      dodging: false,
      comboStep: 0,
    });

    session = sessionReducer(session, { type: "START_MISSION", nowMs: 2_000 });
    expect(session.player.combat).toEqual({
      attacking: false,
      blocking: false,
      dodging: false,
      comboStep: 0,
    });
  });

  it("does not damage Anakin while blocking or dodging", () => {
    const blocking = sessionReducer(createSession("playing"), {
      type: "SET_COMBAT_STATE",
      combat: { attacking: false, blocking: true, dodging: false, comboStep: 0 },
    });
    const dodging = sessionReducer(createSession("playing"), {
      type: "SET_COMBAT_STATE",
      combat: { attacking: false, blocking: false, dodging: true, comboStep: 0 },
    });

    expect(sessionReducer(blocking, { type: "DAMAGE_PLAYER", amount: 10 })).toBe(blocking);
    expect(sessionReducer(dodging, { type: "DAMAGE_PLAYER", amount: 10 })).toBe(dodging);
  });

  it("records active mission time while excluding time spent paused", () => {
    let session = sessionReducer(createSession(), { type: "START_MISSION", nowMs: 1_000 });
    session = sessionReducer(session, { type: "PAUSE", nowMs: 11_000 });
    session = sessionReducer(session, { type: "RESUME", nowMs: 16_000 });
    session = defeatEnemy({ ...session, activeEncounter: 3 }, "b2-guardian");
    session = sessionReducer(session, { type: "DISABLE_BEACON", nowMs: 31_000 });

    expect(session.missionTimer.completedInMs).toBe(25_000);
    expect(formatMissionTime(session.missionTimer.completedInMs)).toBe("00:25");
  });

  it("formats completion times beyond one minute", () => {
    expect(formatMissionTime(125_900)).toBe("02:05");
  });
});
