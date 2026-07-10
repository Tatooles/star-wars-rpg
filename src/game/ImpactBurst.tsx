import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

type ImpactBurstProps = {
  position: [number, number, number];
  destructive: boolean;
  onComplete: () => void;
};

export function ImpactBurst({ position, destructive, onComplete }: ImpactBurstProps) {
  const group = useRef<THREE.Group>(null);
  const age = useRef(0);
  const completed = useRef(false);

  useFrame((_, delta) => {
    if (completed.current) return;
    age.current += delta;
    if (group.current) {
      const scale = 0.35 + age.current * (destructive ? 5.5 : 3.2);
      group.current.scale.setScalar(scale);
      group.current.rotation.y += delta * 8;
      group.current.children.forEach((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.Material) {
          child.material.opacity = Math.max(0, 1 - age.current * 2.5);
        }
      });
    }
    if (age.current > 0.42) {
      completed.current = true;
      if (group.current) group.current.visible = false;
      onComplete();
    }
  });

  return (
    <group ref={group} position={position}>
      {Array.from({ length: destructive ? 9 : 5 }, (_, index) => (
        <mesh
          key={index}
          position={[
            Math.cos((index / 9) * Math.PI * 2) * 0.35,
            (index % 3) * 0.18,
            Math.sin((index / 9) * Math.PI * 2) * 0.35,
          ]}
          rotation={[index * 0.7, index * 1.3, index * 0.4]}
        >
          <tetrahedronGeometry args={[destructive ? 0.18 : 0.11, 0]} />
          <meshBasicMaterial
            color={index % 2 === 0 ? "#ff7a35" : "#8ad8ff"}
            transparent
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
