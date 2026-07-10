import { useCallback, useEffect, useReducer } from "react";
import { GameScene } from "./game/GameScene";
import { createSession, sessionReducer } from "./game/session";

const controls = [
  ["W A S D", "Move"],
  ["Mouse", "Orbit camera"],
  ["Left click", "Lightsaber"],
  ["Right click", "Block / reflect"],
  ["Shift", "Dodge"],
  ["Space", "Jump"],
  ["Q", "Target lock"],
  ["E", "Interact"],
] as const;

export function App() {
  const [session, dispatch] = useReducer(sessionReducer, undefined, () => createSession());
  const { screen } = session;

  const startMission = useCallback(() => {
    dispatch({ type: "START_MISSION" });
    document.documentElement.requestPointerLock?.().catch(() => undefined);
  }, []);

  const pause = useCallback(() => {
    if (screen !== "playing") return;
    document.exitPointerLock?.();
    dispatch({ type: "PAUSE" });
  }, [screen]);

  const resume = useCallback(() => {
    dispatch({ type: "RESUME" });
    document.documentElement.requestPointerLock?.().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (screen === "defeated" || screen === "complete") document.exitPointerLock?.();
  }, [screen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Escape") pause();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pause]);

  return (
    <main className="app-shell">
      <div className="mobile-blocker" role="dialog" aria-labelledby="mobile-title">
        <div className="mobile-emblem" aria-hidden="true">◈</div>
        <p className="eyebrow">TRANSMISSION INTERRUPTED</p>
        <h1 id="mobile-title">Desktop required</h1>
        <p>
          Star Wars: Break the Signal is not ready for mobile yet. Open it on a
          desktop or laptop to play.
        </p>
      </div>

      <div className="desktop-experience">
        <div className="stars" aria-hidden="true" />
        <div className="horizon" aria-hidden="true" />

        {screen === "title" && (
          <section className="title-screen">
            <div className="title-copy">
              <p className="eyebrow">A JEDI MISSION</p>
              <h1>
                <span>STAR WARS</span>
                Break the Signal
              </h1>
              <p className="briefing">
                A Separatist beacon is broadcasting Republic fleet positions.
                As Anakin Skywalker, breach the outpost, destroy its droid
                defenders, and silence the signal.
              </p>
              <button className="primary-action" onClick={startMission}>
                Start Mission <span aria-hidden="true">→</span>
              </button>
            </div>

            <aside className="controls-card" aria-label="Controls">
              <p className="panel-label">CONTROLS</p>
              <div className="control-grid">
                {controls.map(([key, action]) => (
                  <div className="control-row" key={key}>
                    <kbd>{key}</kbd>
                    <span>{action}</span>
                  </div>
                ))}
              </div>
              <p className="controls-note">ESC to pause and release mouse</p>
            </aside>
          </section>
        )}

        {(screen === "playing" || screen === "paused" || screen === "defeated") && (
          <section className="game-placeholder" aria-label="Mission in progress">
            <GameScene
              key={session.runId}
              playing={screen === "playing"}
              session={session}
              dispatch={dispatch}
            />
            <div className="combat-hud">
              <div className="health-block">
                <span>ANAKIN</span>
                <div className="health-track"><i style={{ width: `${session.player.health}%` }} /></div>
                <b>{session.player.health} / {session.player.maxHealth}</b>
              </div>
              <div className="objective-block">
                <span>CURRENT OBJECTIVE</span>
                <b>{session.objective}</b>
              </div>
              {session.lockedTargetId && session.enemies[0]?.alive && (
                <div className="target-health">
                  <span>B1 BATTLE DROID</span>
                  <div className="target-track">
                    <i style={{ width: `${(session.enemies[0].health / session.enemies[0].maxHealth) * 100}%` }} />
                  </div>
                </div>
              )}
            </div>
            <div className="reticle" aria-hidden="true" />
          </section>
        )}

        {screen === "paused" && (
          <section className="overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title">
            <div className="overlay-card">
              <p className="eyebrow">MISSION STATUS</p>
              <h2 id="pause-title">Paused</h2>
              <button className="primary-action" onClick={resume}>Resume</button>
              <button className="secondary-action" onClick={startMission}>
                Restart Mission
              </button>
              <p className="controls-note">WASD move · Mouse look · LMB attack · RMB block · Q lock</p>
            </div>
          </section>
        )}

        {screen === "defeated" && (
          <section className="overlay defeated-overlay" role="dialog" aria-modal="true" aria-labelledby="defeat-title">
            <div className="overlay-card">
              <p className="eyebrow">MISSION FAILED</p>
              <h2 id="defeat-title">Anakin defeated</h2>
              <button className="primary-action" onClick={startMission}>Restart Mission</button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
