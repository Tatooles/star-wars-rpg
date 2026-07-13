import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

const dustPositions = (() => {
  const values = new Float32Array(360 * 3);
  let seed = 3187;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let index = 0; index < 360; index += 1) {
    values[index * 3] = (random() - 0.5) * 56;
    values[index * 3 + 1] = random() * 12 + 0.5;
    values[index * 3 + 2] = 32 - random() * 90;
  }
  return values;
})();

export function Atmosphere() {
  const dust = useRef<THREE.Points>(null);

  useFrame((_, delta) => {
    if (dust.current) dust.current.rotation.y += delta * 0.0025;
  });

  return (
    <group>
      <mesh scale={120}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshBasicMaterial color="#101826" side={THREE.BackSide} fog={false} />
      </mesh>
      <points ref={dust}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dustPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#dfb58c"
          size={0.07}
          transparent
          opacity={0.42}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <mesh position={[-34, 10, -66]}>
        <sphereGeometry args={[7.5, 16, 10]} />
        <meshBasicMaterial color="#b84b30" fog={false} />
      </mesh>
      <mesh position={[-31, 10.5, -60]}>
        <sphereGeometry args={[1.3, 12, 8]} />
        <meshBasicMaterial color="#f5c27c" fog={false} />
      </mesh>
    </group>
  );
}
