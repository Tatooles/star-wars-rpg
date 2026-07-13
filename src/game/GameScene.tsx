import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { CuboidCollider, Physics, RapierRigidBody, RigidBody } from "@react-three/rapier";
import {
  Dispatch,
  MutableRefObject,
  RefObject,
  useCallback,
  useEffect,
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
import { summarizeFrameTimes } from "./fps";

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

const BEACON_INTERACTION_RANGE = 7.5;

function PerformanceProbe() {
  const { gl } = useThree();
  const samples = useRef<number[]>([]);
  const peakCalls = useRef(0);
  const peakTriangles = useRef(0);

  useFrame((_, delta) => {
    if (!import.meta.env.DEV) return;
    samples.current.push(delta * 1_000);
    peakCalls.current = Math.max(peakCalls.current, gl.info.render.calls);
    peakTriangles.current = Math.max(peakTriangles.current, gl.info.render.triangles);
    if (samples.current.length < 300) return;
    document.documentElement.dataset.renderMetrics = JSON.stringify({
      ...summarizeFrameTimes(samples.current),
      drawCalls: peakCalls.current,
      triangles: peakTriangles.current,
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
      shaderPrograms: gl.info.programs?.length ?? 0,
      sampleFrames: samples.current.length,
    });
    samples.current = [];
    peakCalls.current = 0;
    peakTriangles.current = 0;
  });
  return null;
}

function useDeferredQueue() {
  const pendingTimers = useRef(new Set<number>());

  useEffect(() => {
    const timers = pendingTimers.current;
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
      timers.clear();
    };
  }, []);

  return useCallback((callback: () => void) => {
    const timer = window.setTimeout(() => {
      pendingTimers.current.delete(timer);
      callback();
    }, 0);
    pendingTimers.current.add(timer);
  }, []);
}

type MissionDirectorProps = {
  controls: RefObject<Controls>;
  playerRef: RefObject<RapierRigidBody | null>;
  cameraYawRef: RefObject<number>;
  enemyBodies: RefObject<Map<string, RapierRigidBody>>;
  enemyPositions: RefObject<Map<string, THREE.Vector3>>;
  lockedTargetPositionRef: RefObject<THREE.Vector3 | null>;
  session: GameSession;
  dispatch: Dispatch<SessionAction>;
  setBeaconNearby: (nearby: boolean) => void;
};

function MissionDirector({
  controls,
  playerRef,
  cameraYawRef,
  enemyBodies,
  enemyPositions,
  lockedTargetPositionRef,
  session,
  dispatch,
  setBeaconNearby,
}: MissionDirectorProps) {
  const { camera, scene } = useThree();
  const lastLockPress = useRef(0);
  const lastInteractPress = useRef(0);
  const wasNearBeacon = useRef(false);
  const lineOfSightLostFor = useRef(0);
  const lineOfSightRay = useRef(new THREE.Raycaster());
  const lastRecenteredEncounter = useRef(0);

  useFrame((_, delta) => {
    if (session.screen !== "playing") {
      lastLockPress.current = controls.current.lockPresses;
      lastInteractPress.current = controls.current.interactPresses;
      return;
    }
    const player = playerRef.current;
    if (!player) return;
    const playerPosition = player.translation();
    for (const enemy of session.enemies) {
      const body = enemyBodies.current.get(enemy.id);
      if (!enemy.alive || !body) {
        enemyPositions.current.delete(enemy.id);
        continue;
      }
      const position = body.translation();
      enemyPositions.current.set(enemy.id, new THREE.Vector3(position.x, position.y, position.z));
    }
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

    if (
      session.activeEncounter === 1 &&
      encounterOneClear &&
      lastRecenteredEncounter.current < 1
    ) {
      cameraYawRef.current = Math.PI;
      lastRecenteredEncounter.current = 1;
    }
    if (
      session.activeEncounter === 2 &&
      encounterTwoClear &&
      lastRecenteredEncounter.current < 2
    ) {
      cameraYawRef.current = Math.PI;
      lastRecenteredEncounter.current = 2;
    }

    if (session.activeEncounter === 0 && playerPosition.z < 12) {
      dispatch({ type: "ACTIVATE_ENCOUNTER", encounter: 1 });
    } else if (session.activeEncounter === 1 && encounterOneClear && playerPosition.z < -5) {
      dispatch({ type: "ACTIVATE_ENCOUNTER", encounter: 2 });
    } else if (session.activeEncounter === 2 && encounterTwoClear && playerPosition.z < -29) {
      dispatch({ type: "ACTIVATE_ENCOUNTER", encounter: 3 });
    }

    const guardian = session.enemies.find((enemy) => enemy.kind === "b2");
    const beaconDistance = Math.hypot(playerPosition.x, playerPosition.z + 44);
    const nearBeacon = Boolean(
      guardian && !guardian.alive && beaconDistance < BEACON_INTERACTION_RANGE,
    );
    if (nearBeacon !== wasNearBeacon.current) {
      wasNearBeacon.current = nearBeacon;
      setBeaconNearby(nearBeacon);
    }

    const interactPressed = controls.current.interactPresses !== lastInteractPress.current;
    lastInteractPress.current = controls.current.interactPresses;
    if (interactPressed && nearBeacon) {
      dispatch({ type: "DISABLE_BEACON", nowMs: performance.now() });
    }

    const lockedBody = session.lockedTargetId
      ? enemyBodies.current.get(session.lockedTargetId) ?? null
      : null;
    lockedTargetPositionRef.current = session.lockedTargetId
      ? enemyPositions.current.get(session.lockedTargetId) ?? null
      : null;
    if (session.lockedTargetId) {
      const lockedEnemy = session.enemies.find((enemy) => enemy.id === session.lockedTargetId);
      if (!lockedEnemy?.alive || !lockedBody) {
        dispatch({ type: "CLEAR_LOCK", targetId: session.lockedTargetId });
      } else {
        const position = lockedBody.translation();
        const distance = Math.hypot(position.x - playerPosition.x, position.z - playerPosition.z);
        const origin = new THREE.Vector3(
          playerPosition.x,
          playerPosition.y + 0.65,
          playerPosition.z,
        );
        const direction = new THREE.Vector3(
          position.x - origin.x,
          position.y + 0.7 - origin.y,
          position.z - origin.z,
        );
        const rayDistance = direction.length();
        direction.normalize();
        lineOfSightRay.current.set(origin, direction);
        lineOfSightRay.current.far = rayDistance;
        const obstruction = lineOfSightRay.current
          .intersectObjects(scene.children, true)
          .find((hit) => {
            let object: THREE.Object3D | null = hit.object;
            while (object) {
              if (object.userData.cameraObstacle) return true;
              object = object.parent;
            }
            return false;
          });
        const visible = !obstruction;
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
  const enemyPositions = useRef(new Map<string, THREE.Vector3>());
  const lockedTargetPositionRef = useRef<THREE.Vector3>(null);
  const sceneRef = useRef<THREE.Scene>(null);
  const meleeObstacleMeshes = useRef<THREE.Object3D[]>([]);
  const yawRef = useRef(Math.PI) as MutableRefObject<number>;
  const { controls } = useControls(playing);
  const blockingRef = useRef(false);
  const invulnerableRef = useRef(false);
  const controlLockUntilRef = useRef(0);
  const nextProjectileId = useRef(1);
  const nextImpactId = useRef(1);
  const [projectiles, setProjectiles] = useState<ProjectileState[]>([]);
  const [impacts, setImpacts] = useState<ImpactState[]>([]);
  const [beaconNearby, setBeaconNearby] = useState(false);
  const defer = useDeferredQueue();

  const dispatchSession = useCallback(
    (action: SessionAction) => {
      defer(() => dispatch(action));
    },
    [defer, dispatch],
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
    (range: number, playerPosition: THREE.Vector3, playerRotation: THREE.Quaternion) => {
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(
        playerRotation,
      );
      const origin = new THREE.Vector3(playerPosition.x, playerPosition.y + 0.65, playerPosition.z);
      let nearest: { id: string; score: number; position: THREE.Vector3 } | null = null;
      for (const enemy of session.enemies) {
        if (!enemy.alive || enemy.encounter > session.activeEncounter) continue;
        const position = enemyPositions.current.get(enemy.id);
        if (!position) continue;
        const toEnemy = new THREE.Vector3(
          position.x - playerPosition.x,
          0,
          position.z - playerPosition.z,
        );
        const distance = toEnemy.length();
        if (distance > range || distance < 0.01) continue;
        toEnemy.normalize();
        const facing = forward.dot(toEnemy);
        if (facing < PLAYER_TUNING.attackFacingThreshold) continue;

        const lockedBonus = enemy.id === session.lockedTargetId ? -range : 0;
        const score = distance + (1 - facing) * range + lockedBonus;
        if (!nearest || score < nearest.score) nearest = { id: enemy.id, score, position };
      }
      if (!nearest) return null;

      if (meleeObstacleMeshes.current.length === 0 && sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          let ancestor: THREE.Object3D | null = object;
          while (ancestor) {
            if (ancestor.userData.cameraObstacle) {
              meleeObstacleMeshes.current.push(object);
              return;
            }
            ancestor = ancestor.parent;
          }
        });
      }
      const target = new THREE.Vector3(
        nearest.position.x,
        nearest.position.y + 0.7,
        nearest.position.z,
      );
      const line = target.sub(origin);
      const lineLength = line.length();
      const ray = new THREE.Raycaster(origin, line.normalize(), 0, lineLength);
      const obstruction = ray.intersectObjects(meleeObstacleMeshes.current, false)[0];
      return obstruction && obstruction.distance < lineLength - PLAYER_TUNING.targetContactRadius
        ? null
        : nearest.id;
    },
    [session.activeEncounter, session.enemies, session.lockedTargetId],
  );

  const removeProjectile = useCallback((id: number) => {
    defer(
      () => setProjectiles((current) => current.filter((projectile) => projectile.id !== id)),
    );
  }, [defer]);

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
    defer(() => setProjectiles((current) => [...current, projectile]));
  }, [defer, onSound]);

  const reflectProjectile = useCallback(
    (id: number, projectilePosition: [number, number, number]) => {
      onSound("reflect");
      defer(
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
      );
    },
    [defer, onSound],
  );

  const damageEnemy = useCallback(
    (enemyId: string, amount: number) => {
      const enemy = session.enemies.find((candidate) => candidate.id === enemyId);
      const position = enemyPositions.current.get(enemyId);
      if (enemy?.alive && position) {
        const impactId = nextImpactId.current++;
        const impact: ImpactState = {
          id: impactId,
          position: [position.x, position.y + 0.8, position.z],
          destructive: amount >= enemy.health,
        };
        defer(() => setImpacts((current) => [...current, impact]));
      }
      onSound("impact");
      dispatchSession({ type: "DAMAGE_ENEMY", enemyId, amount });
    },
    [defer, dispatchSession, onSound, session.enemies],
  );

  const encounterOneAlive = session.enemies.some((enemy) => enemy.encounter === 1 && enemy.alive);
  const encounterTwoAlive = session.enemies.some((enemy) => enemy.encounter === 2 && enemy.alive);

  return (
    <>
      <div className="canvas-input-surface">
        <Canvas
        shadows="basic"
        camera={{ fov: 54, near: 0.08, far: 180, position: [2.4, 4.5, 25] }}
        dpr={[1, 1.25]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl, scene }) => {
          sceneRef.current = scene;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
        }}
      >
        <color attach="background" args={["#101826"]} />
        <fog attach="fog" args={["#3b2d25", 24, 92]} />
        <Atmosphere />
        <PerformanceProbe />
        <hemisphereLight args={["#7898b5", "#4a281b", 1.45]} />
        <directionalLight
          castShadow
          color="#ffe2bd"
          intensity={2.7}
          position={[-14, 18, 8]}
          shadow-mapSize={[1024, 1024]}
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
            lockedTargetPositionRef={lockedTargetPositionRef}
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
            cameraYawRef={yawRef}
            enemyBodies={enemyBodies}
            enemyPositions={enemyPositions}
            lockedTargetPositionRef={lockedTargetPositionRef}
            session={session}
            dispatch={dispatchSession}
            setBeaconNearby={(nearby) => defer(() => setBeaconNearby(nearby))}
          />
        </Physics>
        {impacts.map((impact) => (
          <ImpactBurst
            key={impact.id}
            position={impact.position}
            destructive={impact.destructive}
            onComplete={() => defer(
              () => setImpacts((current) => current.filter((candidate) => candidate.id !== impact.id)),
            )}
          />
        ))}
        <CameraRig
          playerRef={playerRef}
          yawRef={yawRef}
          controls={controls}
          enabled={playing}
          lockedTargetId={session.lockedTargetId}
          lockedTargetPositionRef={lockedTargetPositionRef}
        />
        </Canvas>
      </div>
      {beaconNearby && !session.beaconDisabled && (
        <div className="interaction-prompt"><kbd>E</kbd> Disable beacon</div>
      )}
    </>
  );
}
