import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { Panel, Pipe } from "./ModelParts";
import { materials } from "./visualAssets";

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
      {Array.from({ length: 8 }, (_, i) => {
        const angle = i / 8 * Math.PI * 2;
        return <group key={i} rotation={[0, angle, 0]}>
          <Panel position={[0, -0.25, 2.55]} size={[0.4, 2, 0.35]} material={materials.hull} rotation={[-0.2, 0, 0]} />
          <Panel position={[0, 0.3, 2.75]} size={[0.12, 0.65, 0.06]} material={disabled ? materials.dark : materials.red} />
        </group>;
      })}
      <Pipe position={[0, -1.05, 0]} size={[3.2, 0.25, 3.2]} material={materials.dark} />
      <Pipe position={[0, 1.12, 0]} size={[2.65, 0.18, 2.65]} material={materials.trim} />
      <Panel position={[0, 0, 2.8]} size={[1.05, 0.65, 0.15]} material={materials.dark} rotation={[-0.3, 0, 0]} />
      <Panel position={[0, 0.03, 2.91]} size={[0.72, 0.36, 0.025]} material={disabled ? materials.dark : materials.blue} rotation={[-0.3, 0, 0]} />
      <mesh castShadow>
        <cylinderGeometry args={[2.5, 3.1, 2.4, 32]} />
        <meshStandardMaterial color="#657174" metalness={0.55} roughness={0.48} />
      </mesh>
      <group ref={rings} position={[0, 1.5, 0]}>
        {[0, Math.PI / 2].map((rotation) => (
          <mesh key={rotation} rotation={[Math.PI / 2, rotation, 0]}>
            <torusGeometry args={[1.6, 0.12, 12, 48]} />
            <meshStandardMaterial color="#44535a" metalness={0.8} roughness={0.3} />
          </mesh>
        ))}
      </group>
      <mesh ref={beam} position={[0, 10, 0]}>
        <cylinderGeometry args={[0.28, 0.65, 19, 10, 1, true]} />
        <meshBasicMaterial color={disabled ? "#697078" : "#e8472d"} transparent opacity={0.25} toneMapped={false} />
      </mesh>
      <pointLight color={disabled ? "#62707a" : "#ff482f"} intensity={disabled ? 1 : 18} distance={18} position={[0, 3, 0]} />
    </group>
  );
}
