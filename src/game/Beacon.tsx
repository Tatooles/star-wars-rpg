import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

type BeaconProps = {
  disabled: boolean;
};

export function Beacon({ disabled }: BeaconProps) {
  const rings = useRef<THREE.Group>(null);
  const beam = useRef<THREE.Mesh>(null);

  useFrame(({ clock }, delta) => {
    if (rings.current) rings.current.rotation.y += delta * (disabled ? 0.15 : 1.1);
    if (beam.current) {
      const material = beam.current.material as THREE.MeshBasicMaterial;
      material.opacity = disabled ? 0.05 : 0.24 + Math.sin(clock.elapsedTime * 5) * 0.05;
    }
  });

  return (
    <group position={[0, 1.2, -44]} userData={{ cameraObstacle: true }}>
      <mesh castShadow>
        <cylinderGeometry args={[2.5, 3.1, 2.4, 10]} />
        <meshStandardMaterial color="#263138" metalness={0.75} roughness={0.38} />
      </mesh>
      <group ref={rings} position={[0, 1.5, 0]}>
        {[0, Math.PI / 2].map((rotation) => (
          <mesh key={rotation} rotation={[Math.PI / 2, rotation, 0]}>
            <torusGeometry args={[1.6, 0.12, 7, 28]} />
            <meshStandardMaterial color="#44535a" metalness={0.8} roughness={0.3} />
          </mesh>
        ))}
      </group>
      <mesh ref={beam} position={[0, 10, 0]}>
        <cylinderGeometry args={[0.28, 0.65, 19, 10, 1, true]} />
        <meshBasicMaterial color={disabled ? "#697078" : "#e8472d"} transparent opacity={0.25} toneMapped={false} userData={{ glow: true }} />
      </mesh>
      <pointLight color={disabled ? "#62707a" : "#ff482f"} intensity={disabled ? 1 : 18} distance={18} position={[0, 3, 0]} />
    </group>
  );
}
