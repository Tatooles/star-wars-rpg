import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { RAISED_PLATFORM } from "./outpostGround";

const rockMaterial = new THREE.MeshStandardMaterial({ color: "#5a4031", roughness: 0.98 });
const groundMaterial = new THREE.MeshStandardMaterial({ color: "#38271f", roughness: 1 });
const metalMaterial = new THREE.MeshStandardMaterial({ color: "#29343a", roughness: 0.72, metalness: 0.52 });
const pathMaterial = new THREE.MeshStandardMaterial({ color: "#655043", roughness: 0.96 });
const paintedMetalMaterial = new THREE.MeshStandardMaterial({ color: "#526069", roughness: 0.76, metalness: 0.38 });
const darkMetalMaterial = new THREE.MeshStandardMaterial({ color: "#161d21", roughness: 0.64, metalness: 0.62 });
const lampMaterial = new THREE.MeshBasicMaterial({ color: "#ffd09b", toneMapped: false });
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

function RepresentativeSlice() {
  return (
    <group>
      {[-1, 1].map((side) => (
        <group
          key={`barricade-${side}`}
          position={[side * 4.15, 0.58, 10.5]}
          rotation={[0, side * -0.2, 0]}
        >
          <group>
            <mesh material={paintedMetalMaterial} castShadow receiveShadow>
              <boxGeometry args={[2.7, 0.72, 0.3]} />
            </mesh>
            {[-1, 1].map((leg) => (
              <mesh key={leg} material={darkMetalMaterial} position={[leg * 0.95, -0.48, 0]} rotation={[0, 0, leg * 0.22]} castShadow>
                <boxGeometry args={[0.18, 0.8, 0.24]} />
              </mesh>
            ))}
          </group>
        </group>
      ))}
      <group position={[-6.5, 0, 5.3]}>
        {[0, 1].map((level) => (
          <mesh key={level} material={paintedMetalMaterial} position={[level * 0.35, 0.52 + level * 0.92, level * 0.12]} castShadow receiveShadow>
            <boxGeometry args={[1.35, 0.9, 1.25]} />
          </mesh>
        ))}
        {[-0.42, 0.42].map((x) => (
          <mesh key={x} material={darkMetalMaterial} position={[x, 0.54, -0.64]}>
            <boxGeometry args={[0.1, 0.62, 0.08]} />
          </mesh>
        ))}
      </group>
      <group position={[6.3, 0, 3.8]}>
        <mesh material={darkMetalMaterial} position={[0, 1.65, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.3, 3.3, 8]} />
        </mesh>
        <mesh material={paintedMetalMaterial} position={[0, 3.2, 0]} rotation={[0.2, 0, -0.18]} castShadow>
          <boxGeometry args={[1.35, 0.16, 0.7]} />
        </mesh>
        <mesh material={lampMaterial} position={[-0.42, 3.12, -0.34]}>
          <boxGeometry args={[0.32, 0.09, 0.08]} />
        </mesh>
        <pointLight color="#ffb46f" intensity={7} distance={10} position={[-0.42, 3, -0.6]} />
      </group>
      {[-1, 1].map((side) => (
        <group key={`pipe-${side}`} position={[side * 5.2, 0.32, 15]} rotation={[0, 0, Math.PI / 2]}>
          <mesh material={darkMetalMaterial} castShadow>
            <cylinderGeometry args={[0.18, 0.18, 3.4, 10]} />
          </mesh>
          {[-1.25, 0, 1.25].map((y) => (
            <mesh key={y} material={paintedMetalMaterial} position={[0, y, 0]}>
              <torusGeometry args={[0.21, 0.045, 6, 12]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
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
      <RepresentativeSlice />
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
