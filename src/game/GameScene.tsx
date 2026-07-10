import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { CuboidCollider, Physics, RapierRigidBody, RigidBody } from "@react-three/rapier";
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
import { CameraRig } from "./CameraRig";
import { Outpost } from "./Outpost";
import { Player } from "./Player";
import { Projectile, type ProjectileState } from "./Projectile";
import type { GameSession, SessionAction } from "./session";
import { useControls, type Controls } from "./useControls";

type GameSceneProps = {
  playing: boolean;
  session: GameSession;
  dispatch: Dispatch<SessionAction>;
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
  const lastLockPress = useRef(0);
  const lastInteractPress = useRef(0);
  const wasNearBeacon = useRef(false);

  useFrame(() => {
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
        dispatch({ type: "CLEAR_LOCK" });
      } else {
        const position = lockedBody.translation();
        const distance = Math.hypot(position.x - playerPosition.x, position.z - playerPosition.z);
        if (distance > 28) dispatch({ type: "CLEAR_LOCK" });
      }
    }

    const lockPressed = controls.current.lockPresses !== lastLockPress.current;
    lastLockPress.current = controls.current.lockPresses;
    if (!lockPressed) return;
    if (session.lockedTargetId) {
      dispatch({ type: "CLEAR_LOCK" });
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
  );
}

export function GameScene({ playing, session, dispatch }: GameSceneProps) {
  const playerRef = useRef<RapierRigidBody>(null);
  const enemyBodies = useRef(new Map<string, RapierRigidBody>());
  const lockedTargetRef = useRef<RapierRigidBody>(null);
  const yawRef = useRef(Math.PI) as MutableRefObject<number>;
  const controls = useControls(playing);
  const blockingRef = useRef(false);
  const invulnerableRef = useRef(false);
  const nextProjectileId = useRef(1);
  const [projectiles, setProjectiles] = useState<ProjectileState[]>([]);
  const [beaconNearby, setBeaconNearby] = useState(false);

  const registerEnemyBody = useCallback((enemyId: string, body: RapierRigidBody | null) => {
    if (body) enemyBodies.current.set(enemyId, body);
    else enemyBodies.current.delete(enemyId);
  }, []);

  const removeProjectile = useCallback((id: number) => {
    setProjectiles((current) => current.filter((projectile) => projectile.id !== id));
  }, []);

  const spawnProjectile = useCallback((spawn: ProjectileSpawn) => {
    const id = nextProjectileId.current++;
    setProjectiles((current) => [
      ...current,
      {
        id,
        sourceId: spawn.sourceId,
        position: spawn.position.toArray(),
        direction: spawn.direction.toArray(),
        reflected: false,
      },
    ]);
  }, []);

  const reflectProjectile = useCallback(
    (id: number, projectilePosition: [number, number, number]) => {
      setProjectiles((current) =>
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
      );
    },
    [],
  );

  const encounterOneAlive = session.enemies.some((enemy) => enemy.encounter === 1 && enemy.alive);
  const encounterTwoAlive = session.enemies.some((enemy) => enemy.encounter === 2 && enemy.alive);

  return (
    <>
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
        <Physics paused={!playing} gravity={[0, -20, 0]} timeStep="vary">
          <Outpost />
          <Beacon disabled={session.beaconDisabled} />
          <Player
            bodyRef={playerRef}
            cameraYaw={yawRef}
            controls={controls}
            damageMultiplier={session.player.damageMultiplier}
            blockingRef={blockingRef}
            invulnerableRef={invulnerableRef}
            lockedTargetRef={lockedTargetRef}
            onEnemyHit={(enemyId, amount) => dispatch({ type: "DAMAGE_ENEMY", enemyId, amount })}
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
                  if (invulnerableRef.current) return;
                  playerRef.current?.applyImpulse(
                    { x: direction.x * 4.5, y: 2.8, z: direction.z * 4.5 },
                    true,
                  );
                  dispatch({ type: "DAMAGE_PLAYER", amount: 10 });
                }}
              />
            ),
          )}
          {projectiles.map((projectile) => (
            <Projectile
              key={projectile.id}
              projectile={projectile}
              blockingRef={blockingRef}
              invulnerableRef={invulnerableRef}
              onRemove={removeProjectile}
              onReflect={reflectProjectile}
              onPlayerHit={(amount) => dispatch({ type: "DAMAGE_PLAYER", amount })}
              onEnemyHit={(enemyId, amount) =>
                dispatch({
                  type: "DAMAGE_ENEMY",
                  enemyId,
                  amount: enemyId === "b2-guardian" ? Math.min(amount, 55) : amount,
                })
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
            dispatch={dispatch}
            setBeaconNearby={setBeaconNearby}
          />
        </Physics>
        <CameraRig
          playerRef={playerRef}
          yawRef={yawRef}
          enabled={playing}
          lockedTargetRef={lockedTargetRef}
        />
      </Canvas>
      {beaconNearby && !session.beaconDisabled && (
        <div className="interaction-prompt"><kbd>E</kbd> Disable beacon</div>
      )}
    </>
  );
}
