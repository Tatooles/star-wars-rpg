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
  health: number;
  maxHealth: number;
  alive: boolean;
  position: [number, number, number];
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
  };
  enemies: EnemyState[];
  lockedTargetId: string | null;
  objective: Objective;
  beaconDisabled: boolean;
  enemiesDefeated: number;
};

export type SessionAction =
  | { type: "START_MISSION" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "DAMAGE_PLAYER"; amount: number }
  | { type: "DAMAGE_ENEMY"; enemyId: string; amount: number }
  | { type: "TOGGLE_LOCK"; enemyId: string | null }
  | { type: "CLEAR_LOCK" };

const combatSliceEnemies: EnemyState[] = [
  {
    id: "b1-scout",
    kind: "b1",
    health: 55,
    maxHealth: 55,
    alive: true,
    position: [0, 1.2, 15.5],
  },
];

export function createSession(screen: ScreenState = "title", runId = 0): GameSession {
  return {
    screen,
    runId,
    player: { health: 100, maxHealth: 100, level: 1, xp: 0, damageMultiplier: 1 },
    enemies: combatSliceEnemies.map((enemy) => ({ ...enemy })),
    lockedTargetId: null,
    objective: "Reach the Separatist beacon",
    beaconDisabled: false,
    enemiesDefeated: 0,
  };
}

export function sessionReducer(session: GameSession, action: SessionAction): GameSession {
  switch (action.type) {
    case "START_MISSION":
      return createSession("playing", session.runId + 1);
    case "PAUSE":
      return session.screen === "playing" ? { ...session, screen: "paused" } : session;
    case "RESUME":
      return session.screen === "paused" ? { ...session, screen: "playing" } : session;
    case "DAMAGE_PLAYER": {
      if (session.screen !== "playing") return session;
      const health = Math.max(0, session.player.health - action.amount);
      return {
        ...session,
        screen: health === 0 ? "defeated" : session.screen,
        player: { ...session.player, health },
        lockedTargetId: health === 0 ? null : session.lockedTargetId,
      };
    }
    case "DAMAGE_ENEMY": {
      if (session.screen !== "playing") return session;
      const target = session.enemies.find((enemy) => enemy.id === action.enemyId);
      if (!target?.alive) return session;
      const health = Math.max(0, target.health - action.amount);
      const killed = health === 0;
      return {
        ...session,
        enemies: session.enemies.map((enemy) =>
          enemy.id === action.enemyId ? { ...enemy, health, alive: !killed } : enemy,
        ),
        lockedTargetId: killed && session.lockedTargetId === action.enemyId ? null : session.lockedTargetId,
        enemiesDefeated: session.enemiesDefeated + Number(killed),
      };
    }
    case "TOGGLE_LOCK":
      return {
        ...session,
        lockedTargetId: session.lockedTargetId === action.enemyId ? null : action.enemyId,
      };
    case "CLEAR_LOCK":
      return session.lockedTargetId === null ? session : { ...session, lockedTargetId: null };
  }
}
