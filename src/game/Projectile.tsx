import { useFrame } from "@react-three/fiber";
import { BallCollider, RapierRigidBody, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { RefObject, useMemo, useRef } from "react";
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
  playing: boolean;
  blockingRef: RefObject<boolean>;
  invulnerableRef: RefObject<boolean>;
  onRemove: (id: number) => void;
  onReflect: (id: number, position: [number, number, number]) => void;
  onPlayerHit: (damage: number) => void;
  onEnemyHit: (enemyId: string, damage: number) => void;
};

const warmCore = new THREE.Color("#ffe2c5").multiplyScalar(2.5);
const coolCore = new THREE.Color("#b8e9ff").multiplyScalar(2.5);

export function Projectile({
  projectile,
  playing,
  blockingRef,
  invulnerableRef,
  onRemove,
  onReflect,
  onPlayerHit,
  onEnemyHit,
}: ProjectileProps) {
  const boltRotation = useMemo(() => new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0), new THREE.Vector3(...projectile.direction).normalize(),
  ), [projectile.direction]);
  const body = useRef<RapierRigidBody>(null);
  const age = useRef(0);
  const reflectedAge = useRef(0);
  const resolved = useRef(false);

  useFrame((_, delta) => {
    if (!playing || !body.current || resolved.current) return;
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
    const position = body.current.translation();
    body.current.setNextKinematicTranslation({
      x: position.x + projectile.direction[0] * delta * (projectile.reflected ? PROJECTILE_TUNING.reflectedSpeed : PROJECTILE_TUNING.speed),
      y: position.y + projectile.direction[1] * delta * (projectile.reflected ? PROJECTILE_TUNING.reflectedSpeed : PROJECTILE_TUNING.speed),
      z: position.z + projectile.direction[2] * delta * (projectile.reflected ? PROJECTILE_TUNING.reflectedSpeed : PROJECTILE_TUNING.speed),
    });
  });

  return (
    <RigidBody
      ref={body}
      type="kinematicPosition"
      colliders={false}
      position={projectile.position}
      name={`projectile-${projectile.id}`}
    >
      <BallCollider
        args={[0.16]}
        sensor
        onIntersectionEnter={({ other }) => {
          if (resolved.current) return;
          const name = other.rigidBodyObject?.name;
          if (name === "player" && !projectile.reflected) {
            if (blockingRef.current) {
              const position = body.current?.translation();
              if (position) onReflect(projectile.id, [position.x, position.y, position.z]);
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
          if (name?.startsWith("enemy-") && projectile.reflected && name !== `enemy-${projectile.sourceId}`) return;
          if (name === `enemy-${projectile.sourceId}` && projectile.reflected) {
            resolved.current = true;
            onEnemyHit(projectile.sourceId, PROJECTILE_TUNING.reflectedDamage);
            onRemove(projectile.id);
          }
        }}
      />
      <mesh quaternion={boltRotation}>
        <capsuleGeometry args={[0.055, 0.42, 4, 8]} />
        <meshBasicMaterial color={projectile.reflected ? coolCore : warmCore} toneMapped={false} />
      </mesh>
      <mesh quaternion={boltRotation}>
        <capsuleGeometry args={[0.12, 0.4, 4, 8]} />
        <meshBasicMaterial color={projectile.reflected ? "#3fafff" : "#ff4624"}
          transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </RigidBody>
  );
}
