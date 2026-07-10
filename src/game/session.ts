export type ScreenState = "title" | "playing" | "paused" | "defeated" | "complete";
export type EnemyKind = "b1" | "b2";
export type Objective =
  | "Reach the Separatist beacon"
  | "Defeat the beacon guardian"
  | "Disable the communications beacon"
  | "Mission complete";

export type EnemyState = {
  id: string;
  kind: EnemyKind;
  encounter: 1 | 2 | 3;
  health: number;
  maxHealth: number;
  alive: boolean;
  position: [number, number, number];
};

export type PlayerCombatState = {
  attacking: boolean;
  blocking: boolean;
  dodging: boolean;
  comboStep: 0 | 1 | 2;
};

export const IDLE_COMBAT_STATE: PlayerCombatState = {
  attacking: false,
  blocking: false,
  dodging: false,
  comboStep: 0,
};

export type GameSession = {
  screen: ScreenState;
  runId: number;
  player: {
    health: number;
    maxHealth: number;
    level: 1 | 2 | 3;
    xp: number;
    damageMultiplier: number;
    combat: PlayerCombatState;
  };
  enemies: EnemyState[];
  activeEncounter: 0 | 1 | 2 | 3;
  lockedTargetId: string | null;
  objective: Objective;
  beaconDisabled: boolean;
  enemiesDefeated: number;
  levelUpCount: number;
};

export type SessionAction =
  | { type: "START_MISSION" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "ACTIVATE_ENCOUNTER"; encounter: 1 | 2 | 3 }
  | { type: "DAMAGE_PLAYER"; amount: number }
  | { type: "SET_COMBAT_STATE"; combat: PlayerCombatState }
  | { type: "DAMAGE_ENEMY"; enemyId: string; amount: number }
  | { type: "TOGGLE_LOCK"; enemyId: string | null }
  | { type: "CLEAR_LOCK" }
  | { type: "DISABLE_BEACON" };

const b1Positions: Array<[number, number, number]> = [
  [-3.8, 1.2, 8.5],
  [3.6, 1.2, 7],
  [-2.4, 1.2, 3.8],
  [4.2, 1.2, 1],
  [-4.2, 1.2, -12],
  [3.2, 1.2, -15.5],
  [-3.3, 1.2, -20.5],
  [4.3, 1.2, -23.5],
];

function createEnemies(): EnemyState[] {
  const b1s: EnemyState[] = b1Positions.map((position, index) => ({
    id: `b1-${index + 1}`,
    kind: "b1",
    encounter: index < 4 ? 1 : 2,
    health: 55,
    maxHealth: 55,
    alive: true,
    position,
  }));
  return [
    ...b1s,
    {
      id: "b2-guardian",
      kind: "b2",
      encounter: 3,
      health: 220,
      maxHealth: 220,
      alive: true,
      position: [0, 1.55, -38],
    },
  ];
}

export function createSession(screen: ScreenState = "title", runId = 0): GameSession {
  return {
    screen,
    runId,
    player: {
      health: 100,
      maxHealth: 100,
      level: 1,
      xp: 0,
      damageMultiplier: 1,
      combat: { ...IDLE_COMBAT_STATE },
    },
    enemies: createEnemies(),
    activeEncounter: 0,
    lockedTargetId: null,
    objective: "Reach the Separatist beacon",
    beaconDisabled: false,
    enemiesDefeated: 0,
    levelUpCount: 0,
  };
}

function progressionForXp(xp: number) {
  if (xp >= 175) return { level: 3 as const, maxHealth: 140, damageMultiplier: 1.3 };
  if (xp >= 75) return { level: 2 as const, maxHealth: 120, damageMultiplier: 1.15 };
  return { level: 1 as const, maxHealth: 100, damageMultiplier: 1 };
}

export function sessionReducer(session: GameSession, action: SessionAction): GameSession {
  switch (action.type) {
    case "START_MISSION":
      return createSession("playing", session.runId + 1);
    case "PAUSE":
      return session.screen === "playing"
        ? {
            ...session,
            screen: "paused",
            player: { ...session.player, combat: { ...IDLE_COMBAT_STATE } },
          }
        : session;
    case "RESUME":
      return session.screen === "paused" ? { ...session, screen: "playing" } : session;
    case "ACTIVATE_ENCOUNTER": {
      if (session.screen !== "playing" || action.encounter <= session.activeEncounter) return session;
      return {
        ...session,
        activeEncounter: action.encounter,
        objective: action.encounter === 3 ? "Defeat the beacon guardian" : session.objective,
      };
    }
    case "DAMAGE_PLAYER": {
      if (session.screen !== "playing") return session;
      if (session.player.combat.blocking || session.player.combat.dodging) return session;
      const health = Math.max(0, session.player.health - action.amount);
      return {
        ...session,
        screen: health === 0 ? "defeated" : session.screen,
        player: { ...session.player, health },
        lockedTargetId: health === 0 ? null : session.lockedTargetId,
      };
    }
    case "SET_COMBAT_STATE": {
      if (session.screen !== "playing") return session;
      const current = session.player.combat;
      const next = action.combat;
      if (
        current.attacking === next.attacking &&
        current.blocking === next.blocking &&
        current.dodging === next.dodging &&
        current.comboStep === next.comboStep
      ) {
        return session;
      }
      return { ...session, player: { ...session.player, combat: next } };
    }
    case "DAMAGE_ENEMY": {
      if (session.screen !== "playing") return session;
      const target = session.enemies.find((enemy) => enemy.id === action.enemyId);
      if (!target?.alive || target.encounter > session.activeEncounter) return session;
      const health = Math.max(0, target.health - action.amount);
      const killed = health === 0;
      if (!killed) {
        return {
          ...session,
          enemies: session.enemies.map((enemy) =>
            enemy.id === action.enemyId ? { ...enemy, health } : enemy,
          ),
        };
      }

      const xp = session.player.xp + (target.kind === "b1" ? 25 : 100);
      const progression = progressionForXp(xp);
      const levelIncrease = progression.level - session.player.level;
      const enemies = session.enemies.map((enemy) =>
        enemy.id === action.enemyId ? { ...enemy, health: 0, alive: false } : enemy,
      );
      const guardianDefeated = target.kind === "b2";
      return {
        ...session,
        enemies,
        player: {
          ...session.player,
          xp,
          ...progression,
          health: Math.min(progression.maxHealth, session.player.health + levelIncrease * 20),
        },
        lockedTargetId: session.lockedTargetId === action.enemyId ? null : session.lockedTargetId,
        enemiesDefeated: session.enemiesDefeated + 1,
        levelUpCount: session.levelUpCount + Number(levelIncrease > 0),
        objective: guardianDefeated ? "Disable the communications beacon" : session.objective,
      };
    }
    case "TOGGLE_LOCK":
      return {
        ...session,
        lockedTargetId: session.lockedTargetId === action.enemyId ? null : action.enemyId,
      };
    case "CLEAR_LOCK":
      return session.lockedTargetId === null ? session : { ...session, lockedTargetId: null };
    case "DISABLE_BEACON": {
      const guardian = session.enemies.find((enemy) => enemy.kind === "b2");
      if (session.screen !== "playing" || guardian?.alive || session.beaconDisabled) return session;
      return {
        ...session,
        screen: "complete",
        objective: "Mission complete",
        beaconDisabled: true,
        lockedTargetId: null,
      };
    }
  }
}
