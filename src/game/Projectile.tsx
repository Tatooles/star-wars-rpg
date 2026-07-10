import { useFrame } from "@react-three/fiber";
import { BallCollider, RapierRigidBody, RigidBody } from "@react-three/rapier";
import { RefObject, useRef } from "react";

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
  const body = useRef<RapierRigidBody>(null);
  const age = useRef(0);
  const reflectedAge = useRef(0);
  const resolved = useRef(false);

  useFrame((_, delta) => {
    if (!playing || !body.current || resolved.current) return;
    age.current += delta;
    if (projectile.reflected) {
      reflectedAge.current += delta;
      if (reflectedAge.current >= 0.22) {
        resolved.current = true;
        onEnemyHit(projectile.sourceId, 100);
        onRemove(projectile.id);
        return;
      }
    }
    if (age.current > 5) {
      resolved.current = true;
      onRemove(projectile.id);
      return;
    }
    const position = body.current.translation();
    body.current.setNextKinematicTranslation({
      x: position.x + projectile.direction[0] * delta * (projectile.reflected ? 18 : 13),
      y: position.y + projectile.direction[1] * delta * (projectile.reflected ? 18 : 13),
      z: position.z + projectile.direction[2] * delta * (projectile.reflected ? 18 : 13),
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
                onPlayerHit(projectile.sourceId === "b2-guardian" ? 4 : 2);
              }
              onRemove(projectile.id);
            }
          }
          if (name?.startsWith("enemy-") && projectile.reflected && name !== `enemy-${projectile.sourceId}`) return;
          if (name === `enemy-${projectile.sourceId}` && projectile.reflected) {
            resolved.current = true;
            onEnemyHit(projectile.sourceId, 100);
            onRemove(projectile.id);
          }
        }}
      />
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.055, 0.42, 4, 8]} />
        <meshBasicMaterial color={projectile.reflected ? "#63baff" : "#ff4a2e"} toneMapped={false} />
      </mesh>
      <pointLight
        color={projectile.reflected ? "#168dff" : "#ff3d1d"}
        intensity={4}
        distance={2.5}
      />
    </RigidBody>
  );
}
