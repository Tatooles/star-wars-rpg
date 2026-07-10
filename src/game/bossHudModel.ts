import type { GameSession } from "./session";

export function getActiveBoss(session: GameSession) {
  if (session.activeEncounter !== 3) return null;

  return session.enemies.find((enemy) => enemy.kind === "b2" && enemy.alive) ?? null;
}
