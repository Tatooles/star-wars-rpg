import { lazy, Suspense, useCallback, useEffect, useReducer, useRef, useState } from "react";
import { ProceduralAudio, type SoundCue } from "./game/audio";
import { getActiveBoss } from "./game/bossHudModel";
import { FpsCounter } from "./game/FpsCounter";
import { createSession, formatMissionTime, sessionReducer } from "./game/session";

const GameScene = lazy(() =>
  import("./game/GameScene").then((module) => ({ default: module.GameScene })),
);
const AssetPreloader = lazy(() =>
  import("./game/AssetPreloader").then((module) => ({ default: module.AssetPreloader })),
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
  const [assetsReady, setAssetsReady] = useState(false);
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
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [pause, screen]);

  const playSound = useCallback((cue: SoundCue) => audio.play(cue), [audio]);

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
        <Suspense fallback={null}>
          <AssetPreloader onReady={() => setAssetsReady(true)} />
        </Suspense>
        <div className="stars" aria-hidden="true" />
        <div className="horizon" aria-hidden="true" />
        <FpsCounter />

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
              <button className="primary-action" onClick={startMission} disabled={!assetsReady}>
                {assetsReady ? "Start Mission" : "Loading Mission"} <span aria-hidden="true">→</span>
              </button>
              {!assetsReady && <p className="asset-loading-status">PREPARING LOCAL ASSETS...</p>}
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
              <p className="controls-note">ESC to pause</p>
            </aside>
          </section>
        )}

        {(screen === "playing" || screen === "paused" || screen === "defeated") && (
          <section
            className={`game-placeholder${screen === "playing" ? " is-playing" : ""}`}
            aria-label="Mission in progress"
          >
            <Suspense fallback={<div className="mission-loading">INITIALIZING MISSION...</div>}>
              <GameScene
                key={session.runId}
                playing={screen === "playing"}
                session={session}
                dispatch={dispatch}
                onSound={playSound}
              />
            </Suspense>
            <div className="combat-hud">
              <div className="health-block">
                <span>ANAKIN</span>
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
              <p className="controls-note">W/S move · A/D turn · Space attack · F block · Q lock</p>
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
