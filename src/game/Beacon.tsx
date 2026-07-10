import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { GAME_ASSETS } from "./assetManifest";

type BeaconProps = { disabled: boolean };

export function Beacon({ disabled }: BeaconProps) {
  const gltf = useGLTF(GAME_ASSETS.beacon);
  const scene = useMemo(() => clone(gltf.scene), [gltf.scene]);
  const beam = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);

  useEffect(() => {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
        object.userData.cameraObstacle = true;
      }
    });
  }, [scene]);

  useFrame(({ clock }, delta) => {
    const rings = scene.getObjectByName("Beacon_Rings");
    if (rings) rings.rotation.y += delta * (disabled ? 0.1 : 0.75);
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || object.material.name !== "BeaconGlow") return;
      const material = object.material as THREE.MeshStandardMaterial;
      material.emissive.set(disabled ? "#18232a" : "#e73e22");
      material.emissiveIntensity = disabled ? 0.15 : 3.4;
    });
    if (beam.current) {
      const material = beam.current.material as THREE.MeshBasicMaterial;
      material.opacity = disabled ? 0.025 : 0.17 + Math.sin(clock.elapsedTime * 5) * 0.035;
    }
    if (light.current) light.current.intensity = disabled ? 0.6 : 12;
  });

  return (
    <group position={[0, 1.2, -44]} userData={{ cameraObstacle: true }}>
      <primitive object={scene} />
      <mesh ref={beam} position={[0, 9.5, 0]}>
        <cylinderGeometry args={[0.22, 0.58, 18, 10, 1, true]} />
        <meshBasicMaterial color={disabled ? "#61707a" : "#ed4328"} transparent opacity={0.2} toneMapped={false} depthWrite={false} />
      </mesh>
      <pointLight ref={light} color={disabled ? "#60717c" : "#ff472d"} intensity={12} distance={16} position={[0, 3, 0]} />
    </group>
  );
}
