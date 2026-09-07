import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

const dustPositions = (() => {
  const values = new Float32Array(240 * 3);
  let seed = 3187;
  for (let index = 0; index < values.length; index++) {
    seed = (seed * 16807) % 2147483647;
    const random = (seed - 1) / 2147483646;
    values[index] = index % 3 === 0 ? (random - 0.5) * 48 : index % 3 === 1 ? random * 9 : 30 - random * 90;
  }
  return values;
})();

const skyMaterial = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  uniforms: {
    zenith: { value: new THREE.Color("#617e8a") },
    horizon: { value: new THREE.Color("#e8c09a") },
  },
  vertexShader: `varying vec3 vDirection;
    void main() { vDirection = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `varying vec3 vDirection; uniform vec3 zenith; uniform vec3 horizon;
    void main() {
      vec3 dir = normalize(vDirection);
      float height = pow(max(dir.y, 0.0), 0.45);
      vec3 color = mix(horizon, zenith, height);
      float sun = pow(max(dot(dir, normalize(vec3(-0.62, 0.28, -0.74))), 0.0), 42.0);
      color += vec3(0.6, 0.24, 0.055) * sun;
      gl_FragColor = vec4(color, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});

export function Atmosphere() {
  const dust = useRef<THREE.Points>(null);
  useFrame((_, delta) => {
    if (dust.current) dust.current.rotation.y += delta * 0.003;
  });
  return (
    <group>
      <mesh material={skyMaterial}>
        <sphereGeometry args={[230, 32, 16]} />
      </mesh>
      <mesh position={[-120, 54, -145]}>
        <sphereGeometry args={[4.3, 24, 16]} />
        <meshBasicMaterial color="#fff0d0" fog={false} toneMapped={false} />
      </mesh>
      <mesh position={[-101, 44, -150]}>
        <sphereGeometry args={[1.9, 20, 12]} />
        <meshBasicMaterial color="#f6bc80" fog={false} toneMapped={false} />
      </mesh>
      <points ref={dust}>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[dustPositions, 3]} /></bufferGeometry>
        <pointsMaterial color="#ffe5be" size={0.035} transparent opacity={0.3} depthWrite={false} />
      </points>
    </group>
  );
}
