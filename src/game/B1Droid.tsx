import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RapierRigidBody, RigidBody } from "@react-three/rapier";
import { RefObject, useRef } from "react";
import * as THREE from "three";
import type { EnemyState } from "./session";
import { B1_TUNING } from "./combatTuning";
import { EnemyIndicator } from "./EnemyIndicator";

export type ProjectileSpawn = {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  sourceId: string;
};

type B1DroidProps = {
  enemy: EnemyState;
  playerRef: RefObject<RapierRigidBody | null>;
  playing: boolean;
  active: boolean;
  locked: boolean;
  registerBody: (enemyId: string, body: RapierRigidBody | null) => void;
  onFire: (spawn: ProjectileSpawn) => void;
};

const tan = new THREE.MeshStandardMaterial({ color: "#b7a27b", roughness: 0.78, metalness: 0.12 });
const dark = new THREE.MeshStandardMaterial({ color: "#2a2d2b", roughness: 0.55, metalness: 0.4 });

export function B1Droid({
  enemy,
  playerRef,
  playing,
  active,
  locked,
  registerBody,
  onFire,
}: B1DroidProps) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const fireTimer = useRef(
    B1_TUNING.initialFireDelay +
      (Number(enemy.id.split("-")[1]) % 4) * B1_TUNING.initialFireDelayStep,
  );
  const telegraph = useRef(0);
  const orbitDirection = useRef(1);
  const engageTime = useRef(0);
  const lastHealth = useRef(enemy.health);
  const hitReaction = useRef(0);
  const model = useRef<THREE.Group>(null);
  const telegraphLight = useRef<THREE.PointLight>(null);

  useFrame((_, delta) => {
    const body = bodyRef.current;
    const player = playerRef.current;
    registerBody(enemy.id, enemy.alive ? body : null);
    if (enemy.health < lastHealth.current) hitReaction.current = B1_TUNING.hitRecovery;
    lastHealth.current = enemy.health;
    hitReaction.current = Math.max(0, hitReaction.current - delta);
    if (model.current) {
      model.current.position.y = Math.sin(performance.now() * 0.004) * 0.025;
      model.current.rotation.z = hitReaction.current > 0
        ? Math.sin(hitReaction.current * 42) * 0.14
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
    engageTime.current += delta;
    towardPlayer.normalize();
    const strafe = new THREE.Vector3(-towardPlayer.z, 0, towardPlayer.x).multiplyScalar(orbitDirection.current);
    const move = new THREE.Vector3();
    if (engageTime.current > 1.35) {
      if (distance < B1_TUNING.retreatDistance) move.addScaledVector(towardPlayer, -2.4);
      if (distance > B1_TUNING.pursueDistance) move.addScaledVector(towardPlayer, 2.1);
      if (
        distance >= B1_TUNING.retreatDistance &&
        distance <= B1_TUNING.pursueDistance
      ) {
        move.addScaledVector(strafe, 1.15);
      }
    }
    const next = new THREE.Vector3(position.x, position.y, position.z).addScaledVector(move, delta);
    const encounterBoundary = enemy.encounter === 1 ? -5 : -26;
    next.x = THREE.MathUtils.clamp(next.x, -4.8, 4.8);
    next.z = Math.max(next.z, encounterBoundary);
    body.setNextKinematicTranslation(next);
    const yaw = Math.atan2(towardPlayer.x, towardPlayer.z);
    body.setNextKinematicRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw));

    fireTimer.current -= delta;
    if (fireTimer.current <= B1_TUNING.telegraphDuration && fireTimer.current > 0) {
      telegraph.current = 1 - fireTimer.current / B1_TUNING.telegraphDuration;
    }
    if (fireTimer.current <= 0) {
      const muzzle = new THREE.Vector3(position.x, position.y + 1.1, position.z).addScaledVector(towardPlayer, 0.7);
      const target = new THREE.Vector3(playerPosition.x, playerPosition.y + 0.2, playerPosition.z);
      onFire({ position: muzzle, direction: target.sub(muzzle).normalize(), sourceId: enemy.id });
      fireTimer.current = B1_TUNING.fireCooldown + Math.random() * B1_TUNING.fireCooldownVariance;
      telegraph.current = 0;
      if (Math.random() > 0.68) orbitDirection.current *= -1;
    }
    if (telegraphLight.current) {
      telegraphLight.current.intensity = telegraph.current * 8;
      telegraphLight.current.color.set(telegraph.current > 0 ? "#ff3b1f" : "#5e160d");
    }
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
      <CapsuleCollider args={[0.52, 0.38]} position={[0, 0.2, 0]} />
      <group ref={model}>
        <mesh material={tan} position={[0, 1.55, 0]} castShadow>
          <boxGeometry args={[0.46, 0.42, 0.38]} />
        </mesh>
        <mesh material={dark} position={[0, 1.58, 0.22]} castShadow>
          <boxGeometry args={[0.24, 0.08, 0.12]} />
        </mesh>
        <mesh material={tan} position={[0, 0.75, 0]} castShadow>
          <boxGeometry args={[0.42, 0.82, 0.3]} />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh material={tan} position={[side * 0.34, 0.82, 0]} rotation={[0, 0, side * 0.08]} castShadow>
              <capsuleGeometry args={[0.065, 0.72, 4, 6]} />
            </mesh>
            <mesh material={tan} position={[side * 0.16, -0.05, 0]} castShadow>
              <capsuleGeometry args={[0.075, 0.9, 4, 6]} />
            </mesh>
          </group>
        ))}
        <mesh material={dark} position={[0.4, 0.82, 0.35]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.12, 0.85, 7]} />
        </mesh>
        <pointLight
          ref={telegraphLight}
          color="#5e160d"
          intensity={0}
          distance={3}
          position={[0.4, 0.8, 0.8]}
        />
      </group>
      <EnemyIndicator
        bodyRef={bodyRef}
        enemy={enemy}
        locked={locked}
      />
    </RigidBody>
  );
}
