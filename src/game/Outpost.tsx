import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { RAISED_PLATFORM } from "./outpostGround";

const rockMaterial = new THREE.MeshStandardMaterial({ color: "#4b4038", roughness: 0.96 });
const groundMaterial = new THREE.MeshStandardMaterial({ color: "#312c29", roughness: 1 });
const metalMaterial = new THREE.MeshStandardMaterial({ color: "#303b40", roughness: 0.68, metalness: 0.45 });
const pathMaterial = new THREE.MeshStandardMaterial({ color: "#50443a", roughness: 0.94 });
const signalMaterial = new THREE.MeshStandardMaterial({
  color: "#512116",
  emissive: "#d94226",
  emissiveIntensity: 2.2,
  roughness: 0.5,
});

type ObstacleProps = {
  position: [number, number, number];
  size: [number, number, number];
  rotation?: [number, number, number];
  material?: THREE.Material;
};

function Obstacle({ position, size, rotation = [0, 0, 0], material = rockMaterial }: ObstacleProps) {
  return (
    <RigidBody type="fixed" colliders="cuboid" position={position} rotation={rotation}>
      <mesh
        material={material}
        scale={material === rockMaterial ? [size[0] / 2, size[1] / 2, size[2] / 2] : [1, 1, 1]}
        castShadow
        receiveShadow
        userData={{ cameraObstacle: true }}
      >
        {material === rockMaterial ? (
          <dodecahedronGeometry args={[1, 0]} />
        ) : (
          <boxGeometry args={size} />
        )}
      </mesh>
    </RigidBody>
  );
}

export function Outpost() {
  return (
    <group>
      <RigidBody type="fixed" colliders="cuboid" position={[0, -0.55, -10]}>
        <mesh material={groundMaterial} receiveShadow userData={{ cameraObstacle: true }}>
          <boxGeometry args={[24, 1, 78]} />
        </mesh>
      </RigidBody>
      {Array.from({ length: 13 }, (_, index) => (
        <mesh
          key={index}
          material={pathMaterial}
          position={[0, 0.015, 22 - index * 5.3]}
          rotation={[0, index % 2 === 0 ? 0.015 : -0.015, 0]}
          receiveShadow
        >
          <boxGeometry args={[7.4, 0.05, 4.6]} />
        </mesh>
      ))}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.7, 4, 39]} position={[-12.3, 3, -10]} />
        <CuboidCollider args={[0.7, 4, 39]} position={[12.3, 3, -10]} />
        <CuboidCollider args={[12, 4, 0.7]} position={[0, 3, 29]} />
        <CuboidCollider args={[12, 4, 0.7]} position={[0, 3, -49]} />
      </RigidBody>

      <Obstacle position={[-8.6, 1.4, 14]} size={[5.2, 3.8, 4]} rotation={[0.12, 0.42, 0.05]} />
      <Obstacle position={[9, 1.1, 10]} size={[4.3, 3.1, 6.2]} rotation={[-0.08, -0.25, 0.08]} />
      <Obstacle position={[-9.4, 1.8, -4]} size={[3.4, 5.1, 7]} rotation={[0.03, -0.32, -0.05]} />
      <Obstacle position={[9.5, 1.2, -10]} size={[4.1, 3.4, 5]} rotation={[0.08, 0.2, 0.12]} />
      <Obstacle position={[-8.8, 1.2, -24]} size={[4.5, 3.4, 7]} rotation={[0.08, 0.3, -0.04]} />
      <Obstacle position={[9.6, 1.5, -30]} size={[3.8, 4.2, 6]} rotation={[0, -0.3, 0.06]} />

      <Obstacle position={[-5.7, 1.8, -5]} size={[1.1, 4.6, 8]} material={metalMaterial} />
      <Obstacle position={[5.7, 1.8, -5]} size={[1.1, 4.6, 8]} material={metalMaterial} />
      <mesh
        material={metalMaterial}
        position={[RAISED_PLATFORM.centerX, RAISED_PLATFORM.centerY, RAISED_PLATFORM.centerZ]}
        receiveShadow
        userData={{ cameraObstacle: true }}
      >
        <cylinderGeometry
          args={[
            RAISED_PLATFORM.topRadius,
            RAISED_PLATFORM.bottomRadius,
            RAISED_PLATFORM.height,
            12,
          ]}
        />
      </mesh>
      <RigidBody type="fixed" colliders="cuboid" position={[0, -0.45, -42]}>
        <mesh material={metalMaterial} receiveShadow userData={{ cameraObstacle: true }}>
          <boxGeometry args={[18, 0.9, 12]} />
        </mesh>
      </RigidBody>

      {[-1, 1].map((side) => (
        <group key={side} position={[side * 6.3, 2.4, -39]} userData={{ cameraObstacle: true }}>
          <mesh material={metalMaterial} castShadow userData={{ cameraObstacle: true }}>
            <cylinderGeometry args={[0.7, 1.15, 5.4, 8]} />
          </mesh>
          <mesh material={metalMaterial} position={[0, 2.5, 0]} rotation={[0, 0, side * 0.65]} castShadow>
            <boxGeometry args={[0.5, 4.2, 0.5]} />
          </mesh>
        </group>
      ))}
      {[-1, 1].map((side) => (
        <group key={`signal-${side}`} position={[side * 5.2, 1.05, -31]} userData={{ cameraObstacle: true }}>
          <mesh material={metalMaterial} castShadow>
            <boxGeometry args={[0.8, 2.1, 0.8]} />
          </mesh>
          <mesh material={signalMaterial} position={[0, 0.5, 0.42]}>
            <boxGeometry args={[0.28, 0.64, 0.08]} />
          </mesh>
          <pointLight color="#f34e2d" intensity={5} distance={5} position={[0, 0.5, 0.7]} />
        </group>
      ))}
    </group>
  );
}
