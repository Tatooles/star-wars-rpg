import { useGLTF } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { memo, useEffect, useMemo } from "react";
import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { GAME_ASSETS } from "./assetManifest";
import { isLegacyCameraObstacle } from "./outpostCameraObstacles";

type CollisionBox = {
  position: [number, number, number];
  halfExtents: [number, number, number];
  rotation?: [number, number, number];
};

const obstacleColliders: CollisionBox[] = [
  { position: [-8.6, 1.4, 14], halfExtents: [2.6, 1.9, 2], rotation: [0.12, 0.42, 0.05] },
  { position: [9, 1.1, 10], halfExtents: [2.15, 1.55, 3.1], rotation: [-0.08, -0.25, 0.08] },
  { position: [-9.4, 1.8, -4], halfExtents: [1.7, 2.55, 3.5], rotation: [0.03, -0.32, -0.05] },
  { position: [9.5, 1.2, -10], halfExtents: [2.05, 1.7, 2.5], rotation: [0.08, 0.2, 0.12] },
  { position: [-8.8, 1.2, -24], halfExtents: [2.25, 1.7, 3.5], rotation: [0.08, 0.3, -0.04] },
  { position: [9.6, 1.5, -30], halfExtents: [1.9, 2.1, 3], rotation: [0, -0.3, 0.06] },
  { position: [-5.7, 1.8, -5], halfExtents: [0.55, 2.3, 4] },
  { position: [5.7, 1.8, -5], halfExtents: [0.55, 2.3, 4] },
];

function OutpostVisuals() {
  const gltf = useGLTF(GAME_ASSETS.outpost);
  const scene = useMemo(() => clone(gltf.scene), [gltf.scene]);
  useEffect(() => {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = !object.name.startsWith("Ground");
        object.receiveShadow = true;
        object.userData.cameraObstacle = isLegacyCameraObstacle(object.name);
      }
    });
  }, [scene]);
  return <primitive object={scene} />;
}

export const Outpost = memo(function Outpost() {
  return (
    <group>
      <OutpostVisuals />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[12, 0.5, 39]} position={[0, -0.55, -10]} />
        <CuboidCollider args={[0.7, 4, 39]} position={[-12.3, 3, -10]} />
        <CuboidCollider args={[0.7, 4, 39]} position={[12.3, 3, -10]} />
        <CuboidCollider args={[12, 4, 0.7]} position={[0, 3, 29]} />
        <CuboidCollider args={[12, 4, 0.7]} position={[0, 3, -49]} />
        <CuboidCollider args={[9, 0.45, 6]} position={[0, -0.45, -42]} />
        {obstacleColliders.map((collider, index) => (
          <CuboidCollider
            key={index}
            args={collider.halfExtents}
            position={collider.position}
            rotation={collider.rotation}
          />
        ))}
      </RigidBody>
    </group>
  );
});
