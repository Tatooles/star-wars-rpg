import { useFrame } from "@react-three/fiber";
import type { RapierRigidBody } from "@react-three/rapier";
import { RefObject, useRef } from "react";
import * as THREE from "three";
import { PROJECTILE_TUNING } from "./combatTuning";

export type ProjectileState = {
  id: number;
  sourceId: string;
  position: [number, number, number];
  direction: [number, number, number];
  reflected: boolean;
};

type ProjectileProps = {
  projectile: ProjectileState;
  playerRef: RefObject<RapierRigidBody | null>;
  playing: boolean;
  blockingRef: RefObject<boolean>;
  invulnerableRef: RefObject<boolean>;
  onRemove: (id: number) => void;
  onReflect: (id: number, position: [number, number, number]) => void;
  onPlayerHit: (damage: number) => void;
  onEnemyHit: (enemyId: string, damage: number) => void;
};

const boltCoreGeometry = new THREE.CapsuleGeometry(0.055, 0.42, 4, 8);
const boltGlowGeometry = new THREE.CapsuleGeometry(0.11, 0.48, 4, 8);
const boltMaterials = {
  hostileCore: new THREE.MeshBasicMaterial({ color: "#ff4a2e", toneMapped: false }),
  reflectedCore: new THREE.MeshBasicMaterial({ color: "#63baff", toneMapped: false }),
  hostileGlow: new THREE.MeshBasicMaterial({
    color: "#ff3d1d",
    transparent: true,
    opacity: 0.24,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  }),
  reflectedGlow: new THREE.MeshBasicMaterial({
    color: "#168dff",
    transparent: true,
    opacity: 0.24,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  }),
} as const;

export function Projectile({
  projectile,
  playerRef,
  playing,
  blockingRef,
  invulnerableRef,
  onRemove,
  onReflect,
  onPlayerHit,
  onEnemyHit,
}: ProjectileProps) {
  const group = useRef<THREE.Group>(null);
  const position = useRef(new THREE.Vector3(...projectile.position));
  const previousPosition = useRef(new THREE.Vector3());
  const movement = useRef(new THREE.Vector3());
  const playerPoint = useRef(new THREE.Vector3());
  const playerOffset = useRef(new THREE.Vector3());
  const closestPoint = useRef(new THREE.Vector3());
  const age = useRef(0);
  const reflectedAge = useRef(0);
  const resolved = useRef(false);
  const reflectionRequested = useRef(false);

  useFrame((_, delta) => {
    if (!playing || resolved.current) return;
    age.current += delta;
    if (projectile.reflected) {
      reflectedAge.current += delta;
      if (reflectedAge.current >= PROJECTILE_TUNING.reflectedFallbackHitDelay) {
        resolved.current = true;
        onEnemyHit(projectile.sourceId, PROJECTILE_TUNING.reflectedDamage);
        onRemove(projectile.id);
        return;
      }
    }
    if (age.current > PROJECTILE_TUNING.lifetime) {
      resolved.current = true;
      onRemove(projectile.id);
      return;
    }
    const speed = projectile.reflected ? PROJECTILE_TUNING.reflectedSpeed : PROJECTILE_TUNING.speed;
    previousPosition.current.copy(position.current);
    movement.current.set(...projectile.direction).multiplyScalar(delta * speed);
    position.current.add(movement.current);
    group.current?.position.copy(position.current);

    if (!projectile.reflected && !reflectionRequested.current) {
      const playerPosition = playerRef.current?.translation();
      if (playerPosition) {
        playerPoint.current.set(playerPosition.x, playerPosition.y + 0.2, playerPosition.z);
        const movementLengthSq = movement.current.lengthSq();
        const closestT = movementLengthSq > 0
          ? THREE.MathUtils.clamp(
              playerOffset.current
                .copy(playerPoint.current)
                .sub(previousPosition.current)
                .dot(movement.current) /
                movementLengthSq,
              0,
              1,
            )
          : 0;
        closestPoint.current
          .copy(previousPosition.current)
          .addScaledVector(movement.current, closestT);
        if (closestPoint.current.distanceToSquared(playerPoint.current) <= 0.72 ** 2) {
          if (blockingRef.current) {
            reflectionRequested.current = true;
            onReflect(projectile.id, position.current.toArray());
          } else {
            resolved.current = true;
            if (!invulnerableRef.current) {
              onPlayerHit(
                projectile.sourceId === "b2-guardian"
                  ? PROJECTILE_TUNING.b2Damage
                  : PROJECTILE_TUNING.b1Damage,
              );
            }
            onRemove(projectile.id);
          }
        }
      }
    }
  });

  return (
    <group
      ref={group}
      position={projectile.position}
      name={`projectile-${projectile.id}`}
    >
      <group dispose={null}>
        <mesh
          geometry={boltCoreGeometry}
          material={projectile.reflected ? boltMaterials.reflectedCore : boltMaterials.hostileCore}
          rotation={[Math.PI / 2, 0, 0]}
        />
        <mesh
          geometry={boltGlowGeometry}
          material={projectile.reflected ? boltMaterials.reflectedGlow : boltMaterials.hostileGlow}
          rotation={[Math.PI / 2, 0, 0]}
        />
      </group>
    </group>
  );
}
