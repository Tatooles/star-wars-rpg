import { lazy, Suspense, useCallback, useEffect, useReducer, useRef, useState } from "react";
import { ProceduralAudio, type SoundCue } from "./game/audio";
import { getActiveBoss } from "./game/bossHudModel";
import { FpsCounter } from "./game/FpsCounter";
import { createSession, formatMissionTime, sessionReducer } from "./game/session";
import { usePerformanceWarning } from "./game/usePerformanceWarning";
import { useExperienceMode } from "./useExperienceMode";

const GameScene = lazy(() =>
  import("./game/GameScene").then((module) => ({ default: module.GameScene })),
);

const controls = [
  ["W / S", "Forward / backpedal"],
  ["A / D", "Turn camera"],
  ["Space / LMB", "Lightsaber"],
  ["F / RMB", "Block / reflect"],
  ["Shift", "Dodge"],
  ["Q", "Target lock"],
  ["E", "Interact"],
] as const;

export function App() {
  const [session, dispatch] = useReducer(sessionReducer, undefined, () => createSession());
  const [audio] = useState(() => new ProceduralAudio());
  const previousHealth = useRef(session.player.health);
  const previousDefeats = useRef(session.enemiesDefeated);
  const previousLevelUps = useRef(session.levelUpCount);
  const previousScreen = useRef(session.screen);
  const { screen } = session;
  const activeBoss = getActiveBoss(session);
  const xpProgress =
    session.player.level === 1
      ? (session.player.xp / 75) * 100
      : session.player.level === 2
        ? ((session.player.xp - 75) / 100) * 100
        : 100;

  const startMission = useCallback(() => {
    void audio.start().catch(() => undefined);
    dispatch({ type: "START_MISSION", nowMs: performance.now() });
  }, [audio]);

  const pause = useCallback(() => {
    if (screen !== "playing") return;
    void audio.suspend().catch(() => undefined);
    dispatch({ type: "PAUSE", nowMs: performance.now() });
  }, [audio, screen]);

  const resume = useCallback(() => {
    void audio.resume().catch(() => undefined);
    dispatch({ type: "RESUME", nowMs: performance.now() });
  }, [audio]);

  const {
    enterFullscreen,
    fullscreenSupported,
    inputMode,
    portrait,
    touchMode,
    webGlSupported,
  } = useExperienceMode(pause);
  const performanceWarning = usePerformanceWarning(
    touchMode && screen === "playing",
    session.runId,
  );

  useEffect(() => {
    if (session.player.health < previousHealth.current) audio.play("hurt");
    if (session.enemiesDefeated > previousDefeats.current) audio.play("destroy");
    if (session.levelUpCount > previousLevelUps.current) audio.play("levelUp");
    if (session.screen === "complete" && previousScreen.current !== "complete") audio.play("beacon");
    previousHealth.current = session.player.health;
    previousDefeats.current = session.enemiesDefeated;
    previousLevelUps.current = session.levelUpCount;
    previousScreen.current = session.screen;
  }, [audio, session]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Escape") pause();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pause]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden" && screen === "playing") pause();
    };
    const onWindowBlur = () => pause();
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onWindowBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, [pause, screen]);

  const playSound = useCallback((cue: SoundCue) => audio.play(cue), [audio]);
  return (
    <main className={`app-shell ${screen === "title" ? "is-title" : "is-mission"} input-${inputMode}${touchMode && portrait ? " is-portrait" : ""}`}>
      <div className="orientation-blocker" role="dialog" aria-labelledby="orientation-title">
        <div className="mobile-emblem" aria-hidden="true">◈</div>
        <p className="eyebrow">ROTATION REQUIRED</p>
        <h1 id="orientation-title">Turn to landscape</h1>
        <p>Rotate your device to continue the mission.</p>
      </div>

      <div className="desktop-experience">
        {(!touchMode || screen === "title") && (
          <FpsCounter onSample={performanceWarning.sample} />
        )}

        {!webGlSupported && (
          <section className="unsupported-device overlay" role="alert">
            <div className="overlay-card">
              <p className="eyebrow">SYSTEM INCOMPATIBLE</p>
              <h2>Device not supported</h2>
              <p>This browser could not start the WebGL renderer required by the mission.</p>
            </div>
          </section>
        )}

        {webGlSupported && screen === "title" && (
          <section className="title-screen">
            <header className="mission-masthead">
              <span className="wordmark">STAR WARS</span>
              <span className="masthead-rule" />
              <span>THE CLONE WARS</span>
            </header>
            <div className="title-copy">
              <p className="eyebrow"><span className="status-dot" /> OUTER RIM · SEPARATIST TERRITORY</p>
              <h1>
                Break<br /><span className="title-second-line">the Signal</span>
              </h1>
              <p className="briefing">
                One transmission could turn the war.
                Infiltrate the Separatist outpost as Anakin Skywalker
                and silence the signal before it reaches the fleet.
              </p>
              <div className="mission-chips"><span>ANAKIN SKYWALKER</span><span>SOLO MISSION</span></div>
              <div className="title-actions">
                <button className="primary-action" onClick={startMission}>
                  Start Mission <span aria-hidden="true">→</span>
                </button>
                {touchMode && fullscreenSupported && (
                  <button className="fullscreen-action" onClick={enterFullscreen}>Fullscreen</button>
                )}
              </div>
            </div>

            <aside className="controls-card desktop-controls-card" aria-label="Keyboard and mouse controls">
              <details><summary className="panel-label">FIELD CONTROLS <span>+</span></summary>
              <div className="control-grid">
                {controls.map(([key, action]) => (
                  <div className="control-row" key={key}>
                    <kbd>{key}</kbd>
                    <span>{action}</span>
                  </div>
                ))}
              </div>
              <p className="controls-note">ESC to pause</p></details>
            </aside>
            <aside className="controls-card touch-controls-card" aria-label="Touch controls">
              <p className="panel-label">TOUCH CONTROLS</p>
              <div className="touch-control-diagram" aria-hidden="true">
                <span className="diagram-stick">MOVE<br />TURN</span>
                <span className="diagram-actions"><b>BLOCK</b><b>LOCK</b><b>DODGE</b><strong>ATTACK</strong></span>
              </div>
              <p className="controls-note">Landscape play · Pause anytime</p>
            </aside>
            <footer className="title-footer"><span><i /> REPUBLIC FIELD OPERATIONS</span><span>BREACH THE OUTPOST / DISABLE THE BEACON</span></footer>
          </section>
        )}

        {webGlSupported && (screen === "title" || screen === "playing" || screen === "paused" || screen === "defeated") && (
          <section
            className={`game-placeholder${screen === "playing" ? " is-playing" : ""}`}
            aria-label={screen === "title" ? "Outpost preview" : "Mission in progress"}
          >
            <Suspense fallback={<div className="mission-loading">INITIALIZING MISSION...</div>}>
              <GameScene
                key={session.runId}
                playing={screen === "playing"}
                session={session}
                dispatch={dispatch}
                onSound={playSound}
                mobile={touchMode}
                onPause={pause}
              />
            </Suspense>
            {screen !== "title" && <>
            <div className="scene-grade" aria-hidden="true" />
            <div className="combat-hud">
              <div className="sector-label">OUTER RIM <span> // </span> SIGNAL OUTPOST</div>
              <div className="health-block">
                <div className="health-header">
                  <span>ANAKIN</span>
                  {touchMode && <FpsCounter onSample={performanceWarning.sample} />}
                </div>
                <div className="health-track">
                  <i style={{ width: `${(session.player.health / session.player.maxHealth) * 100}%` }} />
                </div>
                <b>{session.player.health} / {session.player.maxHealth}</b>
              </div>
              <div className="objective-block">
                <span>CURRENT OBJECTIVE</span>
                <b>{session.objective}</b>
              </div>
              {activeBoss && (
                <div className="boss-health">
                  <div className="boss-health-header">
                    <div className="boss-health-copy">
                      <span>BEACON GUARDIAN</span>
                      <b>B2 SUPER BATTLE DROID</b>
                    </div>
                    <strong>{activeBoss.health} / {activeBoss.maxHealth}</strong>
                  </div>
                  <div className="boss-health-track">
                    <i style={{ width: `${(activeBoss.health / activeBoss.maxHealth) * 100}%` }} />
                  </div>
                </div>
              )}
              <div className="progression-hud">
                <div className="level-medallion"><span>LEVEL</span><b>{session.player.level}</b></div>
                <div className="xp-block">
                  <div><span>EXPERIENCE</span><b>{session.player.level === 3 ? "MAX" : `${session.player.xp} XP`}</b></div>
                  <div className="xp-track"><i style={{ width: `${xpProgress}%` }} /></div>
                </div>
              </div>
              {session.levelUpCount > 0 && (
                <div key={session.levelUpCount} className="level-up-banner">
                  <span>LEVEL UP</span>
                  <b>{session.player.level}</b>
                </div>
              )}
            </div>
            <div className="reticle" aria-hidden="true" />
            </>}
            {performanceWarning.visible && touchMode && (
              <div className="performance-warning" role="status">
                <span>Performance is below 30 FPS. Closing other apps may help.</span>
                <button
                  onClick={performanceWarning.dismiss}
                  aria-label="Dismiss performance warning"
                >×</button>
              </div>
            )}
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
              <p className="controls-note">
                {touchMode
                  ? "Joystick move/turn · Hold Block · Tap Attack, Dodge, or Lock"
                  : "W/S move · A/D turn · Space attack · F block · Q lock"}
              </p>
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

        {screen === "complete" && (
          <section className="overlay complete-overlay" role="dialog" aria-modal="true" aria-labelledby="complete-title">
            <div className="overlay-card completion-card">
              <p className="eyebrow">TRANSMISSION SILENCED</p>
              <h2 id="complete-title">Mission complete</h2>
              <p className="completion-copy">
                The Separatist signal is down. Republic fleet positions are secure.
              </p>
              <div className="mission-stats">
                <div><span>MISSION TIME</span><b>{formatMissionTime(session.missionTimer.completedInMs)}</b></div>
                <div><span>FINAL LEVEL</span><b>{session.player.level}</b></div>
                <div><span>EXPERIENCE</span><b>{session.player.xp} XP</b></div>
                <div><span>ENEMIES DEFEATED</span><b>{session.enemiesDefeated}</b></div>
              </div>
              <button className="primary-action" onClick={startMission}>Replay Mission</button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
