import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RapierRigidBody, RigidBody } from "@react-three/rapier";
import { RefObject, useRef } from "react";
import * as THREE from "three";
import type { ProjectileSpawn } from "./B1Droid";
import type { EnemyState } from "./session";

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

const armor = new THREE.MeshStandardMaterial({ color: "#35424b", roughness: 0.42, metalness: 0.7 });
const armorDark = new THREE.MeshStandardMaterial({ color: "#151c21", roughness: 0.5, metalness: 0.65 });

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
  const burstCooldown = useRef(1.4);
  const burstShots = useRef(0);
  const burstTimer = useRef(0);
  const meleeCooldown = useRef(0);
  const muzzleFlash = useRef<THREE.PointLight>(null);

  useFrame((_, delta) => {
    const body = bodyRef.current;
    const player = playerRef.current;
    registerBody(enemy.id, enemy.alive ? body : null);
    if (!body || !player || !playing || !active || !enemy.alive) return;
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
    if (distance < 2.7 && meleeCooldown.current <= 0) {
      onMelee(towardPlayer);
      meleeCooldown.current = 2.35;
    }

    burstCooldown.current -= delta;
    burstTimer.current -= delta;
    if (burstCooldown.current <= 0 && burstShots.current === 0 && distance < 24) {
      burstShots.current = 3;
      burstTimer.current = 0;
      burstCooldown.current = 3.4;
    }
    if (burstShots.current > 0 && burstTimer.current <= 0) {
      const muzzle = new THREE.Vector3(position.x + 0.58, position.y + 1.25, position.z)
        .addScaledVector(towardPlayer, 0.75);
      const target = new THREE.Vector3(playerPosition.x, playerPosition.y + 0.2, playerPosition.z);
      onFire({ position: muzzle, direction: target.sub(muzzle).normalize(), sourceId: enemy.id });
      burstShots.current -= 1;
      burstTimer.current = 0.22;
      if (muzzleFlash.current) muzzleFlash.current.intensity = 12;
    }
    if (muzzleFlash.current) muzzleFlash.current.intensity *= Math.exp(-delta * 18);
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
      <group>
        <mesh material={armor} position={[0, 1.7, 0]} castShadow>
          <boxGeometry args={[1.05, 0.72, 0.72]} />
        </mesh>
        <mesh material={armorDark} position={[0, 1.72, 0.39]} castShadow>
          <boxGeometry args={[0.72, 0.18, 0.12]} />
        </mesh>
        <mesh material={armor} position={[0, 0.72, 0]} castShadow>
          <cylinderGeometry args={[0.62, 0.76, 1.2, 8]} />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh material={armor} position={[side * 0.68, 1.03, 0]} rotation={[0, 0, side * 0.08]} castShadow>
              <capsuleGeometry args={[0.18, 0.95, 5, 8]} />
            </mesh>
            <mesh material={armorDark} position={[side * 0.32, -0.18, 0]} castShadow>
              <capsuleGeometry args={[0.2, 1.12, 5, 8]} />
            </mesh>
          </group>
        ))}
        <mesh material={armorDark} position={[0.68, 0.9, 0.52]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.18, 0.82, 8]} />
        </mesh>
        <pointLight ref={muzzleFlash} color="#ff3c1f" intensity={0} distance={5} position={[0.68, 0.9, 0.9]} />
        {locked && (
          <mesh position={[0, 2.65, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.48, 0.035, 7, 28]} />
            <meshBasicMaterial color="#75bdff" toneMapped={false} />
          </mesh>
        )}
      </group>
    </RigidBody>
  );
}
