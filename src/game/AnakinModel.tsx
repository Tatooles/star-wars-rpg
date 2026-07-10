import { RefObject, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type AnakinModelProps = {
  moving: RefObject<boolean>;
};

const darkCloth = new THREE.MeshStandardMaterial({ color: "#151820", roughness: 0.86 });
const leather = new THREE.MeshStandardMaterial({ color: "#2a211d", roughness: 0.7 });
const skin = new THREE.MeshStandardMaterial({ color: "#c9906b", roughness: 0.75 });
const hair = new THREE.MeshStandardMaterial({ color: "#3b271d", roughness: 0.9 });

export function AnakinModel({ moving }: AnakinModelProps) {
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const stride = moving.current ? Math.sin(clock.elapsedTime * 9) * 0.42 : 0;
    if (leftLeg.current) leftLeg.current.rotation.x = stride;
    if (rightLeg.current) rightLeg.current.rotation.x = -stride;
  });

  return (
    <group position={[0, -0.86, 0]}>
      <group ref={leftLeg} position={[-0.22, 0.8, 0]}>
        <mesh material={darkCloth} position={[0, -0.45, 0]} castShadow>
          <capsuleGeometry args={[0.12, 0.65, 4, 8]} />
        </mesh>
        <mesh material={leather} position={[0, -0.94, 0.06]} castShadow>
          <boxGeometry args={[0.3, 0.18, 0.56]} />
        </mesh>
      </group>
      <group ref={rightLeg} position={[0.22, 0.8, 0]}>
        <mesh material={darkCloth} position={[0, -0.45, 0]} castShadow>
          <capsuleGeometry args={[0.12, 0.65, 4, 8]} />
        </mesh>
        <mesh material={leather} position={[0, -0.94, 0.06]} castShadow>
          <boxGeometry args={[0.3, 0.18, 0.56]} />
        </mesh>
      </group>
      <mesh material={darkCloth} position={[0, 1.25, 0]} castShadow>
        <cylinderGeometry args={[0.34, 0.48, 1.12, 8]} />
      </mesh>
      <mesh material={leather} position={[0, 1.04, 0]} castShadow>
        <boxGeometry args={[0.79, 0.16, 0.52]} />
      </mesh>
      <mesh material={darkCloth} position={[0, 1.08, 0.04]} rotation={[0.05, 0, 0]} castShadow>
        <coneGeometry args={[0.68, 1.55, 5, 1, true]} />
      </mesh>
      <mesh material={skin} position={[0, 2.02, 0]} castShadow>
        <sphereGeometry args={[0.27, 12, 8]} />
      </mesh>
      <mesh material={hair} position={[0, 2.14, -0.02]} scale={[1.08, 0.78, 1.05]} castShadow>
        <sphereGeometry args={[0.29, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.74]} />
      </mesh>
      <mesh material={hair} position={[0, 1.96, -0.2]} scale={[1, 1.6, 0.7]} castShadow>
        <sphereGeometry args={[0.25, 9, 6]} />
      </mesh>
      <mesh material={darkCloth} position={[-0.49, 1.3, 0]} rotation={[0, 0, -0.15]} castShadow>
        <capsuleGeometry args={[0.1, 0.68, 4, 8]} />
      </mesh>
      <mesh material={darkCloth} position={[0.49, 1.3, 0]} rotation={[0, 0, 0.15]} castShadow>
        <capsuleGeometry args={[0.1, 0.68, 4, 8]} />
      </mesh>
    </group>
  );
}
