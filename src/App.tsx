import { useCallback, useEffect, useState } from "react";
import { GameScene } from "./game/GameScene";

type Screen = "title" | "playing" | "paused";

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
  const [screen, setScreen] = useState<Screen>("title");

  const startMission = useCallback(() => {
    setScreen("playing");
    document.documentElement.requestPointerLock?.().catch(() => undefined);
  }, []);

  const pause = useCallback(() => {
    if (screen !== "playing") return;
    document.exitPointerLock?.();
    setScreen("paused");
  }, [screen]);

  const resume = useCallback(() => {
    setScreen("playing");
    document.documentElement.requestPointerLock?.().catch(() => undefined);
  }, []);

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

        {(screen === "playing" || screen === "paused") && (
          <section className="game-placeholder" aria-label="Mission in progress">
            <GameScene playing={screen === "playing"} />
            <p className="objective-label">CURRENT OBJECTIVE</p>
            <p>Reach the Separatist beacon</p>
            <div className="reticle" aria-hidden="true" />
          </section>
        )}

        {screen === "paused" && (
          <section className="overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title">
            <div className="overlay-card">
              <p className="eyebrow">MISSION STATUS</p>
              <h2 id="pause-title">Paused</h2>
              <button className="primary-action" onClick={resume}>Resume</button>
              <button className="secondary-action" onClick={() => setScreen("title")}>
                Restart Mission
              </button>
              <p className="controls-note">WASD move · Mouse look · LMB attack · RMB block · Q lock</p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
