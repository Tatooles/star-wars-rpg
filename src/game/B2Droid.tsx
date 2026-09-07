import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RapierRigidBody, RigidBody } from "@react-three/rapier";
import { RefObject, useRef } from "react";
import * as THREE from "three";
import type { ProjectileSpawn } from "./B1Droid";
import type { EnemyState } from "./session";
import { B2_TUNING } from "./combatTuning";
import { SuperBattleDroidModel } from "./DroidModels";
import { EnemyIndicator } from "./EnemyIndicator";

type B2DroidProps = {
  enemy: EnemyState;
  playerRef: RefObject<RapierRigidBody | null>;
  playing: boolean;
  active: boolean;
  locked: boolean;
  registerBody: (enemyId: string, body: RapierRigidBody | null) => void;
  onFire: (spawn: ProjectileSpawn) => void;
  onMelee: (direction: THREE.Vector3) => void;
};

export function B2Droid({
  enemy,
  playerRef,
  playing,
  active,
  locked,
  registerBody,
  onFire,
  onMelee,
}: B2DroidProps) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const burstCooldown = useRef<number>(B2_TUNING.initialBurstCooldown);
  const burstShots = useRef(0);
  const burstTimer = useRef(0);
  const meleeCooldown = useRef(0);
  const muzzleFlash = useRef<THREE.Mesh>(null);
  const model = useRef<THREE.Group>(null);
  const lastHealth = useRef(enemy.health);
  const hitReaction = useRef(0);

  useFrame((_, delta) => {
    const body = bodyRef.current;
    const player = playerRef.current;
    registerBody(enemy.id, enemy.alive ? body : null);
    if (enemy.health < lastHealth.current) hitReaction.current = B2_TUNING.hitRecovery;
    lastHealth.current = enemy.health;
    hitReaction.current = Math.max(0, hitReaction.current - delta);
    if (model.current) {
      model.current.rotation.z = hitReaction.current > 0
        ? Math.sin(hitReaction.current * 36) * 0.1
        : 0;
    }
    if (!body || !player || !playing || !active || !enemy.alive) return;
    if (hitReaction.current > 0) return;
    const position = body.translation();
    const playerPosition = player.translation();
    const towardPlayer = new THREE.Vector3(
      playerPosition.x - position.x,
      0,
      playerPosition.z - position.z,
    );
    const distance = towardPlayer.length();
    towardPlayer.normalize();
    if (distance > 5.5) {
      body.setNextKinematicTranslation({
        x: position.x + towardPlayer.x * delta * 1.45,
        y: position.y,
        z: position.z + towardPlayer.z * delta * 1.45,
      });
    }
    body.setNextKinematicRotation(
      new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        Math.atan2(towardPlayer.x, towardPlayer.z),
      ),
    );

    meleeCooldown.current = Math.max(0, meleeCooldown.current - delta);
    if (distance < B2_TUNING.meleeRange && meleeCooldown.current <= 0) {
      onMelee(towardPlayer);
      meleeCooldown.current = B2_TUNING.meleeCooldown;
    }

    burstCooldown.current -= delta;
    burstTimer.current -= delta;
    if (burstCooldown.current <= 0 && burstShots.current === 0 && distance < 24) {
      burstShots.current = B2_TUNING.burstShots;
      burstTimer.current = 0;
      burstCooldown.current = B2_TUNING.burstCooldown;
    }
    if (burstShots.current > 0 && burstTimer.current <= 0) {
      const muzzle = new THREE.Vector3(position.x + 0.58, position.y + 1.25, position.z)
        .addScaledVector(towardPlayer, 0.75);
      const target = new THREE.Vector3(playerPosition.x, playerPosition.y + 0.2, playerPosition.z);
      onFire({ position: muzzle, direction: target.sub(muzzle).normalize(), sourceId: enemy.id });
      burstShots.current -= 1;
      burstTimer.current = B2_TUNING.burstSpacing;
      if (muzzleFlash.current) (muzzleFlash.current.material as THREE.MeshBasicMaterial).opacity = 0.9;
    }
    if (muzzleFlash.current) (muzzleFlash.current.material as THREE.MeshBasicMaterial).opacity *= Math.exp(-delta * 18);
  });

  if (!enemy.alive) return null;

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicPosition"
      colliders={false}
      position={enemy.position}
      name={`enemy-${enemy.id}`}
    >
      <CapsuleCollider args={[0.85, 0.68]} position={[0, 0.25, 0]} />
      <group ref={model}>
        <SuperBattleDroidModel />
        <mesh ref={muzzleFlash} position={[0.74, 0.94, 0.95]}>
          <sphereGeometry args={[0.16, 8, 6]} />
          <meshBasicMaterial color="#ff5030" transparent opacity={0} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
      <EnemyIndicator
        bodyRef={bodyRef}
        enemy={enemy}
        locked={locked}
        showHealthBar={!active}
      />
    </RigidBody>
  );
}
