import { Canvas } from "@react-three/fiber";
import { Physics, RapierRigidBody } from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";
import { Dispatch, MutableRefObject, RefObject, useCallback, useRef, useState } from "react";
import * as THREE from "three";
import { B1Droid, type ProjectileSpawn } from "./B1Droid";
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

type CombatDirectorProps = {
  controls: RefObject<Controls>;
  playerRef: RefObject<RapierRigidBody | null>;
  enemyRef: RefObject<RapierRigidBody | null>;
  enemyAlive: boolean;
  locked: boolean;
  dispatch: Dispatch<SessionAction>;
};

function CombatDirector({ controls, playerRef, enemyRef, enemyAlive, locked, dispatch }: CombatDirectorProps) {
  const lastLockPress = useRef(0);

  useFrame(() => {
    const lockPressed = controls.current.lockPresses !== lastLockPress.current;
    lastLockPress.current = controls.current.lockPresses;
    const player = playerRef.current;
    const enemy = enemyRef.current;
    if (lockPressed) {
      if (locked) dispatch({ type: "CLEAR_LOCK" });
      else if (player && enemy && enemyAlive) {
        const playerPosition = player.translation();
        const enemyPosition = enemy.translation();
        const distance = Math.hypot(
          playerPosition.x - enemyPosition.x,
          playerPosition.z - enemyPosition.z,
        );
        if (distance <= 24) dispatch({ type: "TOGGLE_LOCK", enemyId: "b1-scout" });
      }
    }
    if (locked && (!enemy || !enemyAlive)) dispatch({ type: "CLEAR_LOCK" });
  });
  return null;
}

export function GameScene({ playing, session, dispatch }: GameSceneProps) {
  const playerRef = useRef<RapierRigidBody>(null);
  const enemyRef = useRef<RapierRigidBody>(null);
  const yawRef = useRef(Math.PI) as MutableRefObject<number>;
  const controls = useControls(playing);
  const blockingRef = useRef(false);
  const invulnerableRef = useRef(false);
  const nextProjectileId = useRef(1);
  const [projectiles, setProjectiles] = useState<ProjectileState[]>([]);
  const enemy = session.enemies[0];

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

  const reflectProjectile = useCallback((id: number, projectilePosition: [number, number, number]) => {
    const enemyBody = enemyRef.current;
    if (!enemyBody) return removeProjectile(id);
    const enemyPosition = enemyBody.translation();
    setProjectiles((current) =>
      current.map((projectile) => {
        if (projectile.id !== id) return projectile;
        const direction = new THREE.Vector3(
          enemyPosition.x - projectilePosition[0],
          enemyPosition.y + 0.5 - projectilePosition[1],
          enemyPosition.z - projectilePosition[2],
        ).normalize();
        return { ...projectile, reflected: true, direction: direction.toArray() };
      }),
    );
  }, [removeProjectile]);

  if (!enemy) return null;

  return (
    <Canvas
      shadows
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
        <Player
          bodyRef={playerRef}
          cameraYaw={yawRef}
          controls={controls}
          damageMultiplier={session.player.damageMultiplier}
          blockingRef={blockingRef}
          invulnerableRef={invulnerableRef}
          onEnemyHit={(enemyId, amount) => dispatch({ type: "DAMAGE_ENEMY", enemyId, amount })}
        />
        <B1Droid
          enemy={enemy}
          bodyRef={enemyRef}
          playerRef={playerRef}
          playing={playing}
          locked={session.lockedTargetId === enemy.id}
          onFire={spawnProjectile}
        />
        {projectiles.map((projectile) => (
          <Projectile
            key={projectile.id}
            projectile={projectile}
            blockingRef={blockingRef}
            invulnerableRef={invulnerableRef}
            onRemove={removeProjectile}
            onReflect={reflectProjectile}
            onPlayerHit={(amount) => dispatch({ type: "DAMAGE_PLAYER", amount })}
            onEnemyHit={(enemyId, amount) => dispatch({ type: "DAMAGE_ENEMY", enemyId, amount })}
          />
        ))}
        <CombatDirector
          controls={controls}
          playerRef={playerRef}
          enemyRef={enemyRef}
          enemyAlive={enemy.alive}
          locked={session.lockedTargetId === enemy.id}
          dispatch={dispatch}
        />
      </Physics>
      <CameraRig
        playerRef={playerRef}
        yawRef={yawRef}
        enabled={playing}
        lockedTargetRef={session.lockedTargetId === enemy.id ? enemyRef : undefined}
      />
    </Canvas>
  );
}
