import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { CuboidCollider, Physics, RapierRigidBody, RigidBody, useRapier } from "@react-three/rapier";
import {
  Dispatch,
  MutableRefObject,
  RefObject,
  useCallback,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { B1Droid, type ProjectileSpawn } from "./B1Droid";
import { B2Droid } from "./B2Droid";
import { Beacon } from "./Beacon";
import { Atmosphere } from "./Atmosphere";
import { CameraRig } from "./CameraRig";
import { Outpost } from "./Outpost";
import { Player } from "./Player";
import { ImpactBurst } from "./ImpactBurst";
import { Projectile, type ProjectileState } from "./Projectile";
import type { GameSession, PlayerCombatState, SessionAction } from "./session";
import { useControls, type Controls } from "./useControls";
import type { SoundCue } from "./audio";
import { B2_TUNING, PLAYER_TUNING } from "./combatTuning";

type GameSceneProps = {
  playing: boolean;
  session: GameSession;
  dispatch: Dispatch<SessionAction>;
  onSound: (cue: SoundCue) => void;
};

type ImpactState = {
  id: number;
  position: [number, number, number];
  destructive: boolean;
};

type MissionDirectorProps = {
  controls: RefObject<Controls>;
  playerRef: RefObject<RapierRigidBody | null>;
  enemyBodies: RefObject<Map<string, RapierRigidBody>>;
  lockedTargetRef: RefObject<RapierRigidBody | null>;
  session: GameSession;
  dispatch: Dispatch<SessionAction>;
  setBeaconNearby: (nearby: boolean) => void;
};

function MissionDirector({
  controls,
  playerRef,
  enemyBodies,
  lockedTargetRef,
  session,
  dispatch,
  setBeaconNearby,
}: MissionDirectorProps) {
  const { camera } = useThree();
  const { world, rapier } = useRapier();
  const lastLockPress = useRef(0);
  const lastInteractPress = useRef(0);
  const wasNearBeacon = useRef(false);
  const lineOfSightLostFor = useRef(0);

  useFrame((_, delta) => {
    if (session.screen !== "playing") {
      lastLockPress.current = controls.current.lockPresses;
      lastInteractPress.current = controls.current.interactPresses;
      return;
    }
    const player = playerRef.current;
    if (!player) return;
    const playerPosition = player.translation();
    if (import.meta.env.DEV) {
      document.documentElement.dataset.playerPosition = [
        playerPosition.x.toFixed(2),
        playerPosition.y.toFixed(2),
        playerPosition.z.toFixed(2),
      ].join(",");
      document.documentElement.dataset.activeEncounter = String(session.activeEncounter);
      document.documentElement.dataset.enemiesDefeated = String(session.enemiesDefeated);
      document.documentElement.dataset.playerXp = String(session.player.xp);
    }
    const encounterOneClear = session.enemies
      .filter((enemy) => enemy.encounter === 1)
      .every((enemy) => !enemy.alive);
    const encounterTwoClear = session.enemies
      .filter((enemy) => enemy.encounter === 2)
      .every((enemy) => !enemy.alive);

    if (session.activeEncounter === 0 && playerPosition.z < 12) {
      dispatch({ type: "ACTIVATE_ENCOUNTER", encounter: 1 });
    } else if (session.activeEncounter === 1 && encounterOneClear && playerPosition.z < -5) {
      dispatch({ type: "ACTIVATE_ENCOUNTER", encounter: 2 });
    } else if (session.activeEncounter === 2 && encounterTwoClear && playerPosition.z < -29) {
      dispatch({ type: "ACTIVATE_ENCOUNTER", encounter: 3 });
    }

    const guardian = session.enemies.find((enemy) => enemy.kind === "b2");
    const beaconDistance = Math.hypot(playerPosition.x, playerPosition.z + 44);
    const nearBeacon = Boolean(guardian && !guardian.alive && beaconDistance < 4.8);
    if (nearBeacon !== wasNearBeacon.current) {
      wasNearBeacon.current = nearBeacon;
      setBeaconNearby(nearBeacon);
    }

    const interactPressed = controls.current.interactPresses !== lastInteractPress.current;
    lastInteractPress.current = controls.current.interactPresses;
    if (interactPressed && nearBeacon) dispatch({ type: "DISABLE_BEACON" });

    const lockedBody = session.lockedTargetId
      ? enemyBodies.current.get(session.lockedTargetId) ?? null
      : null;
    lockedTargetRef.current = lockedBody;
    if (session.lockedTargetId) {
      const lockedEnemy = session.enemies.find((enemy) => enemy.id === session.lockedTargetId);
      if (!lockedEnemy?.alive || !lockedBody) {
        dispatch({ type: "CLEAR_LOCK", targetId: session.lockedTargetId });
      } else {
        const position = lockedBody.translation();
        const distance = Math.hypot(position.x - playerPosition.x, position.z - playerPosition.z);
        const origin = { x: playerPosition.x, y: playerPosition.y + 0.65, z: playerPosition.z };
        const direction = new THREE.Vector3(
          position.x - origin.x,
          position.y + 0.7 - origin.y,
          position.z - origin.z,
        );
        const rayDistance = direction.length();
        direction.normalize();
        const hit = world.castRay(
          new rapier.Ray(origin, direction),
          rayDistance,
          true,
          undefined,
          undefined,
          undefined,
          player,
          (collider) => !collider.isSensor(),
        );
        const visible = !hit || hit.collider.parent()?.handle === lockedBody.handle;
        lineOfSightLostFor.current = visible ? 0 : lineOfSightLostFor.current + delta;
        if (distance > 28 || lineOfSightLostFor.current > 1.1) {
          dispatch({ type: "CLEAR_LOCK", targetId: session.lockedTargetId });
        }
      }
    } else {
      lineOfSightLostFor.current = 0;
    }

    const lockPressed = controls.current.lockPresses !== lastLockPress.current;
    lastLockPress.current = controls.current.lockPresses;
    if (!lockPressed) return;
    if (session.lockedTargetId) {
      dispatch({ type: "CLEAR_LOCK", targetId: session.lockedTargetId });
      return;
    }

    let best: { id: string; score: number } | null = null;
    for (const enemy of session.enemies) {
      if (!enemy.alive || enemy.encounter > session.activeEncounter) continue;
      const body = enemyBodies.current.get(enemy.id);
      if (!body) continue;
      const position = body.translation();
      const distance = Math.hypot(position.x - playerPosition.x, position.z - playerPosition.z);
      if (distance > 24) continue;
      const projected = new THREE.Vector3(position.x, position.y + 0.8, position.z).project(camera);
      if (projected.z < -1 || projected.z > 1) continue;
      const score = distance + Math.abs(projected.x) * 12 + Math.abs(projected.y) * 3;
      if (!best || score < best.score) best = { id: enemy.id, score };
    }
    if (best) dispatch({ type: "TOGGLE_LOCK", enemyId: best.id });
  });

  return null;
}

function EncounterGate({ z }: { z: number }) {
  return (
    <group userData={{ cameraObstacle: true }}>
      <RigidBody type="fixed" colliders={false} position={[0, 2, z]}>
        <CuboidCollider args={[5.5, 2.4, 0.18]} />
        <mesh>
          <boxGeometry args={[11, 4.8, 0.16]} />
          <meshBasicMaterial color="#e8482f" transparent opacity={0.22} toneMapped={false} />
        </mesh>
        {[-4.5, -2.25, 0, 2.25, 4.5].map((x) => (
          <mesh key={x} position={[x, 0, 0]}>
            <boxGeometry args={[0.045, 4.5, 0.08]} />
            <meshBasicMaterial color="#ff674c" toneMapped={false} />
          </mesh>
        ))}
      </RigidBody>
    </group>
  );
}

export function GameScene({ playing, session, dispatch, onSound }: GameSceneProps) {
  const playerRef = useRef<RapierRigidBody>(null);
  const enemyBodies = useRef(new Map<string, RapierRigidBody>());
  const lockedTargetRef = useRef<RapierRigidBody>(null);
  const yawRef = useRef(Math.PI) as MutableRefObject<number>;
  const { controls, setMouseButton, releaseMouseButtons } = useControls(playing);
  const blockingRef = useRef(false);
  const invulnerableRef = useRef(false);
  const controlLockUntilRef = useRef(0);
  const nextProjectileId = useRef(1);
  const nextImpactId = useRef(1);
  const [projectiles, setProjectiles] = useState<ProjectileState[]>([]);
  const [impacts, setImpacts] = useState<ImpactState[]>([]);
  const [beaconNearby, setBeaconNearby] = useState(false);

  const dispatchSession = useCallback(
    (action: SessionAction) => {
      window.setTimeout(() => dispatch(action), 0);
    },
    [dispatch],
  );

  const updateCombatState = useCallback(
    (combat: PlayerCombatState) => {
      dispatchSession({ type: "SET_COMBAT_STATE", combat });
    },
    [dispatchSession],
  );

  const registerEnemyBody = useCallback((enemyId: string, body: RapierRigidBody | null) => {
    if (body) enemyBodies.current.set(enemyId, body);
    else enemyBodies.current.delete(enemyId);
  }, []);

  const getAssistedEnemyId = useCallback(
    (range: number) => {
      const player = playerRef.current;
      if (!player) return null;
      const playerPosition = player.translation();
      let nearest: { id: string; distance: number } | null = null;
      for (const enemy of session.enemies) {
        if (!enemy.alive || enemy.encounter > session.activeEncounter) continue;
        const body = enemyBodies.current.get(enemy.id);
        if (!body) continue;
        const position = body.translation();
        const distance = Math.hypot(
          position.x - playerPosition.x,
          position.z - playerPosition.z,
        );
        if (distance <= range && (!nearest || distance < nearest.distance)) {
          nearest = { id: enemy.id, distance };
        }
      }
      return nearest?.id ?? null;
    },
    [session.activeEncounter, session.enemies],
  );

  const removeProjectile = useCallback((id: number) => {
    window.setTimeout(
      () => setProjectiles((current) => current.filter((projectile) => projectile.id !== id)),
      0,
    );
  }, []);

  const spawnProjectile = useCallback((spawn: ProjectileSpawn) => {
    onSound("blaster");
    const id = nextProjectileId.current++;
    const projectile: ProjectileState = {
      id,
      sourceId: spawn.sourceId,
      position: spawn.position.toArray(),
      direction: spawn.direction.toArray(),
      reflected: false,
    };
    window.setTimeout(() => setProjectiles((current) => [...current, projectile]), 0);
  }, [onSound]);

  const reflectProjectile = useCallback(
    (id: number, projectilePosition: [number, number, number]) => {
      onSound("reflect");
      window.setTimeout(
        () => setProjectiles((current) =>
          current.map((projectile) => {
            if (projectile.id !== id) return projectile;
            const enemyBody = enemyBodies.current.get(projectile.sourceId);
            if (!enemyBody) return projectile;
            const enemyPosition = enemyBody.translation();
            const direction = new THREE.Vector3(
              enemyPosition.x - projectilePosition[0],
              enemyPosition.y + 0.5 - projectilePosition[1],
              enemyPosition.z - projectilePosition[2],
            ).normalize();
            return { ...projectile, reflected: true, direction: direction.toArray() };
          }),
        ),
        0,
      );
    },
    [onSound],
  );

  const damageEnemy = useCallback(
    (enemyId: string, amount: number) => {
      const enemy = session.enemies.find((candidate) => candidate.id === enemyId);
      const body = enemyBodies.current.get(enemyId);
      if (enemy?.alive && body) {
        const position = body.translation();
        const impactId = nextImpactId.current++;
        const impact: ImpactState = {
          id: impactId,
          position: [position.x, position.y + 0.8, position.z],
          destructive: amount >= enemy.health,
        };
        window.setTimeout(() => setImpacts((current) => [...current, impact]), 0);
      }
      onSound("impact");
      dispatchSession({ type: "DAMAGE_ENEMY", enemyId, amount });
    },
    [dispatchSession, onSound, session.enemies],
  );

  const encounterOneAlive = session.enemies.some((enemy) => enemy.encounter === 1 && enemy.alive);
  const encounterTwoAlive = session.enemies.some((enemy) => enemy.encounter === 2 && enemy.alive);

  return (
    <>
      <div
        className="canvas-input-surface"
        onPointerDownCapture={(event) => {
          setMouseButton(event.button, true);
        }}
        onPointerUpCapture={(event) => {
          setMouseButton(event.button, false);
        }}
        onPointerLeave={releaseMouseButtons}
        onContextMenu={(event) => event.preventDefault()}
      >
        <Canvas
        shadows="basic"
        camera={{ fov: 54, near: 0.08, far: 180, position: [2.4, 4.5, 25] }}
        dpr={[1, 1.7]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
        }}
      >
        <color attach="background" args={["#141719"]} />
        <fog attach="fog" args={["#292723", 30, 100]} />
        <Atmosphere />
        <hemisphereLight args={["#9eb7c8", "#3b251a", 1.8]} />
        <directionalLight
          castShadow
          color="#ffe2bd"
          intensity={3.2}
          position={[14, 24, 10]}
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-34}
          shadow-camera-right={34}
          shadow-camera-top={34}
          shadow-camera-bottom={-34}
        />
        <pointLight color="#ef713c" intensity={22} distance={48} position={[-16, 4, -44]} />
        <Physics paused={!playing} gravity={[0, -20, 0]}>
          <Outpost />
          <Beacon disabled={session.beaconDisabled} />
          <Player
            bodyRef={playerRef}
            cameraYaw={yawRef}
            controls={controls}
            playing={playing}
            damageMultiplier={session.player.damageMultiplier}
            blockingRef={blockingRef}
            invulnerableRef={invulnerableRef}
            lockedTargetRef={lockedTargetRef}
            controlLockUntilRef={controlLockUntilRef}
            getAssistedEnemyId={getAssistedEnemyId}
            onSound={onSound}
            onEnemyHit={damageEnemy}
            onCombatStateChange={updateCombatState}
          />
          {session.enemies.map((enemy) =>
            enemy.kind === "b1" ? (
              <B1Droid
                key={enemy.id}
                enemy={enemy}
                playerRef={playerRef}
                playing={playing}
                active={session.activeEncounter >= enemy.encounter}
                locked={session.lockedTargetId === enemy.id}
                registerBody={registerEnemyBody}
                onFire={spawnProjectile}
              />
            ) : (
              <B2Droid
                key={enemy.id}
                enemy={enemy}
                playerRef={playerRef}
                playing={playing}
                active={session.activeEncounter >= enemy.encounter}
                locked={session.lockedTargetId === enemy.id}
                registerBody={registerEnemyBody}
                onFire={spawnProjectile}
                onMelee={(direction) => {
                  if (blockingRef.current) {
                    onSound("reflect");
                    return;
                  }
                  if (invulnerableRef.current) return;
                  controlLockUntilRef.current = performance.now() + PLAYER_TUNING.knockbackRecoveryMs;
                  playerRef.current?.applyImpulse(
                    { x: direction.x * 4.5, y: 2.8, z: direction.z * 4.5 },
                    true,
                  );
                  dispatchSession({ type: "DAMAGE_PLAYER", amount: B2_TUNING.meleeDamage });
                }}
              />
            ),
          )}
          {projectiles.map((projectile) => (
            <Projectile
              key={projectile.id}
              projectile={projectile}
              playing={playing}
              blockingRef={blockingRef}
              invulnerableRef={invulnerableRef}
              onRemove={removeProjectile}
              onReflect={reflectProjectile}
              onPlayerHit={(amount) => dispatchSession({ type: "DAMAGE_PLAYER", amount })}
              onEnemyHit={(enemyId, amount) =>
                damageEnemy(
                  enemyId,
                  enemyId === "b2-guardian"
                    ? Math.min(amount, B2_TUNING.reflectedDamageCap)
                    : amount,
                )
              }
            />
          ))}
          {session.activeEncounter >= 1 && encounterOneAlive && <EncounterGate z={-7} />}
          {session.activeEncounter >= 2 && encounterTwoAlive && <EncounterGate z={-28} />}
          <MissionDirector
            controls={controls}
            playerRef={playerRef}
            enemyBodies={enemyBodies}
            lockedTargetRef={lockedTargetRef}
            session={session}
            dispatch={dispatchSession}
            setBeaconNearby={(nearby) => window.setTimeout(() => setBeaconNearby(nearby), 0)}
          />
        </Physics>
        {impacts.map((impact) => (
          <ImpactBurst
            key={impact.id}
            position={impact.position}
            destructive={impact.destructive}
            onComplete={() => window.setTimeout(
              () => setImpacts((current) => current.filter((candidate) => candidate.id !== impact.id)),
              0,
            )}
          />
        ))}
        <CameraRig
          playerRef={playerRef}
          yawRef={yawRef}
          enabled={playing}
          lockedTargetRef={lockedTargetRef}
        />
        </Canvas>
      </div>
      {beaconNearby && !session.beaconDisabled && (
        <div className="interaction-prompt"><kbd>E</kbd> Disable beacon</div>
      )}
    </>
  );
}
