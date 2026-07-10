import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { RapierRigidBody } from "@react-three/rapier";
import { type RefObject, useRef } from "react";
import * as THREE from "three";
import { getHealthBarLayout } from "./enemyIndicatorModel";
import { getEnemyIndicatorGroundOffset } from "./outpostGround";
import type { EnemyKind, EnemyState } from "./session";

type EnemyIndicatorProps = {
  bodyRef: RefObject<RapierRigidBody | null>;
  enemy: EnemyState;
  locked: boolean;
  showHealthBar?: boolean;
};

type EnemyIndicatorLayout = {
  barPositionY: number;
  barWidth: number;
  ringRadius: number;
};

const layouts: Record<EnemyKind, EnemyIndicatorLayout> = {
  b1: {
    barPositionY: 2.3,
    barWidth: 1.05,
    ringRadius: 0.68,
  },
  b2: {
    barPositionY: 2.7,
    barWidth: 1.35,
    ringRadius: 0.98,
  },
};

export function EnemyIndicator({
  bodyRef,
  enemy,
  locked,
  showHealthBar = true,
}: EnemyIndicatorProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const { barPositionY, barWidth, ringRadius } = layouts[enemy.kind];
  const { fill, centerX } = getHealthBarLayout(enemy.health, enemy.maxHealth);
  const initialGroundPositionY = getEnemyIndicatorGroundOffset({
    x: enemy.position[0],
    y: enemy.position[1],
    z: enemy.position[2],
  });

  useFrame(() => {
    if (!locked || !ringRef.current) return;
    const bodyPosition = bodyRef.current?.translation();
    if (!bodyPosition) return;
    ringRef.current.position.y = getEnemyIndicatorGroundOffset(bodyPosition);
  });

  return (
    <>
      {showHealthBar && (
        <Billboard position={[0, barPositionY, 0]} renderOrder={10}>
          <mesh>
            <planeGeometry args={[barWidth + 0.08, 0.18]} />
            <meshBasicMaterial color="#dbe7f2" toneMapped={false} depthWrite={false} />
          </mesh>
          <mesh position={[0, 0, 0.004]}>
            <planeGeometry args={[barWidth, 0.1]} />
            <meshBasicMaterial color="#190d0b" toneMapped={false} depthWrite={false} />
          </mesh>
          {fill > 0 && (
            <mesh
              position={[centerX * barWidth, 0, 0.008]}
              scale={[fill, 1, 1]}
            >
              <planeGeometry args={[barWidth, 0.1]} />
              <meshBasicMaterial color="#ed4a32" toneMapped={false} depthWrite={false} />
            </mesh>
          )}
        </Billboard>
      )}

      {locked && (
        <mesh
          ref={ringRef}
          position={[0, initialGroundPositionY, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={9}
        >
          <ringGeometry args={[ringRadius * 0.76, ringRadius, 48]} />
          <meshBasicMaterial
            color="#75bdff"
            transparent
            opacity={0.92}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      )}
    </>
  );
}
